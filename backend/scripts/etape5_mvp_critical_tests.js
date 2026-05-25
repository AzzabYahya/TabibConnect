const { PrismaClient } = require('@prisma/client');

const env = require('../src/config/env');

const prisma = new PrismaClient();

const BASE_URL = 'http://127.0.0.1:4000';
const USER_AGENT = 'TabibConnect-MVP-Critical-Tests';

const DAY_ENUM = [
  'DIMANCHE',
  'LUNDI',
  'MARDI',
  'MERCREDI',
  'JEUDI',
  'VENDREDI',
  'SAMEDI',
];

const request = async (path, { method = 'GET', token, body, cookie, headers = {} } = {}) => {
  const finalHeaders = {
    'User-Agent': USER_AGENT,
    ...headers,
  };

  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  if (cookie) {
    finalHeaders.Cookie = cookie;
  }

  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let parsedBody = null;

  try {
    parsedBody = text ? JSON.parse(text) : null;
  } catch {
    parsedBody = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    body: parsedBody,
    headers: response.headers,
  };
};

const extractCookie = (setCookieHeader) => {
  if (!setCookieHeader) {
    return '';
  }

  return setCookieHeader.split(';')[0];
};

const requestWithCsrf = async (path, options = {}) => {
  const csrfHeaders = {};
  if (options.token) {
    csrfHeaders.Authorization = `Bearer ${options.token}`;
  }
  const csrfResponse = await request('/api/v1/auth/csrf-token', { headers: csrfHeaders });
  const csrfToken = csrfResponse.body?.csrfToken;
  const csrfCookie = extractCookie(csrfResponse.headers.get('set-cookie'));

  const finalHeaders = {
    ...options.headers,
    [env.csrfHeaderName]: csrfToken,
  };

  return request(path, {
    ...options,
    cookie: csrfCookie,
    headers: finalHeaders,
  });
};

const login = async (email, password) => {
  const loginResponse = await requestWithCsrf('/api/v1/auth/login', {
    method: 'POST',
    body: {
      email,
      password,
    },
  });

  if (!loginResponse.ok) {
    throw new Error(
      `Login failed for ${email}: HTTP ${loginResponse.status} -> ${JSON.stringify(loginResponse.body)}`
    );
  }

  return loginResponse.body.data;
};

const findFutureSlot = async (doctorId, maxDays = 35) => {
  for (let offset = 0; offset < maxDays; offset += 1) {
    const date = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
    const dateISO = date.toISOString().slice(0, 10);

    const availResponse = await request(
      `/api/v1/doctors/${doctorId}/availabilities?date=${dateISO}`
    );

    const availabilities = availResponse.body?.data?.availabilities || [];

    for (const availability of availabilities) {
      const slot = (availability.slots || []).find(
        (entry) => new Date(entry.start).getTime() > Date.now() + 60 * 1000
      );

      if (slot) {
        return {
          doctorId,
          disponibiliteId: availability.disponibiliteId,
          cabinetId: availability.cabinet?.id || null,
          dateHeure: slot.start,
        };
      }
    }
  }

  throw new Error(`No future slot found for doctor ${doctorId}`);
};

const run = async () => {
  const summary = {
    test1DoubleBooking: {
      passed: false,
    },
    test2UnverifiedDoctorForbidden: {
      passed: false,
    },
    test3LateCancellationRejected: {
      passed: false,
    },
  };

  const cleanup = {
    appointmentIds: [],
    unverifiedUserId: null,
    unverifiedDoctorId: null,
  };

  try {
    const patient1Auth = await login('youssef.benali@tabibconnect.ma', 'TabibConnect@2026');
    const patient2Auth = await login('khadija.elmansouri@tabibconnect.ma', 'TabibConnect@2026');

    const verifiedDoctor = await prisma.doctor.findFirst({
      where: {
        user: {
          isVerified: true,
        },
      },
      select: {
        id: true,
      },
    });

    if (!verifiedDoctor) {
      throw new Error('No verified doctor found in database');
    }

    // Test 1: concurrent booking on the same slot.
    const sharedSlot = await findFutureSlot(verifiedDoctor.id);

    const createPayload = {
      doctorId: sharedSlot.doctorId,
      disponibiliteId: sharedSlot.disponibiliteId,
      cabinetId: sharedSlot.cabinetId,
      motif: 'MVP test concurrent booking',
      typeConsultation: 'PRESENTIEL',
      notes: 'Critical test #1',
      dateHeure: sharedSlot.dateHeure,
      methodePaiement: 'CASH',
      acceptedGeneralTerms: true,
      acceptedCashPolicy: true,
    };

    const [attemptA, attemptB] = await Promise.all([
      requestWithCsrf('/api/v1/appointments', {
        method: 'POST',
        token: patient1Auth.accessToken,
        body: createPayload,
      }),
      requestWithCsrf('/api/v1/appointments', {
        method: 'POST',
        token: patient2Auth.accessToken,
        body: createPayload,
      }),
    ]);

    const statuses = [attemptA.status, attemptB.status].sort((a, b) => a - b);
    const successAppointments = [attemptA, attemptB]
      .filter((entry) => entry.status === 201)
      .map((entry) => entry.body?.data?.id)
      .filter(Boolean);

    cleanup.appointmentIds.push(...successAppointments);

    summary.test1DoubleBooking = {
      passed: statuses[0] === 201 && statuses[1] === 409,
      statuses,
      detail: 'Exactly one appointment must be created and one must fail with conflict.',
    };

    // Test 2: booking with an unverified doctor must return 403.
    const cabinet = await prisma.cabinet.findFirst({
      select: { id: true },
    });

    if (!cabinet) {
      throw new Error('No cabinet found to prepare unverified doctor test');
    }

    const uniqueSuffix = String(Date.now());

    const unverifiedUser = await prisma.user.create({
      data: {
        email: `unverified.doctor.${uniqueSuffix}@tabibconnect.ma`,
        password: 'UnusedPasswordHash',
        phone: `+212700${uniqueSuffix.slice(-6)}`,
        role: 'DOCTOR',
        isVerified: false,
      },
      select: { id: true },
    });

    cleanup.unverifiedUserId = unverifiedUser.id;

    const unverifiedDoctor = await prisma.doctor.create({
      data: {
        userId: unverifiedUser.id,
        inpe: `INPE-UNVER-${uniqueSuffix}`,
        nomComplet: 'Dr Unverified MVP',
        specialite: 'Medecine Generale',
        diplomes: ['Doctorat Medecine'],
        languesParlees: ['Francais'],
        tarifConsultation: 200,
        accepteAssurance: false,
        assurancesAcceptees: [],
        bio: 'MVP test doctor',
        experience: 3,
      },
      select: { id: true },
    });

    cleanup.unverifiedDoctorId = unverifiedDoctor.id;

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tomorrowDay = DAY_ENUM[tomorrow.getDay()];

    await prisma.disponibilite.create({
      data: {
        doctorId: unverifiedDoctor.id,
        cabinetId: cabinet.id,
        jourSemaine: tomorrowDay,
        heureDebut: '09:00',
        heureFin: '12:00',
        dureeConsultation: 30,
        isActive: true,
      },
    });

    const unverifiedSlot = await findFutureSlot(unverifiedDoctor.id, 3);

    const unverifiedBooking = await requestWithCsrf('/api/v1/appointments', {
      method: 'POST',
      token: patient1Auth.accessToken,
      body: {
        doctorId: unverifiedSlot.doctorId,
        disponibiliteId: unverifiedSlot.disponibiliteId,
        cabinetId: unverifiedSlot.cabinetId,
        motif: 'MVP test unverified doctor',
        typeConsultation: 'PRESENTIEL',
        notes: 'Critical test #2',
        dateHeure: unverifiedSlot.dateHeure,
        methodePaiement: 'CASH',
        acceptedGeneralTerms: true,
        acceptedCashPolicy: true,
      },
    });

    summary.test2UnverifiedDoctorForbidden = {
      passed: unverifiedBooking.status === 403,
      status: unverifiedBooking.status,
      message: unverifiedBooking.body?.message,
    };

    // Test 3: patient cancellation inside 2h window must be rejected.
    const patient = await prisma.patient.findUnique({
      where: { userId: patient1Auth.user.id },
      select: { id: true },
    });

    if (!patient) {
      throw new Error('Patient profile not found for cancellation test');
    }

    const lateAppointment = await prisma.rendezVous.create({
      data: {
        patientId: patient.id,
        doctorId: verifiedDoctor.id,
        motif: 'MVP late cancellation test',
        typeConsultation: 'PRESENTIEL',
        notes: 'Critical test #3',
        statut: 'EN_ATTENTE',
        dateHeure: new Date(Date.now() + 60 * 60 * 1000),
      },
      select: { id: true },
    });

    cleanup.appointmentIds.push(lateAppointment.id);

    const lateCancellation = await requestWithCsrf(`/api/v1/appointments/${lateAppointment.id}/cancel`, {
      method: 'PUT',
      token: patient1Auth.accessToken,
      body: {
        reason: 'Patient tries to cancel too late',
      },
    });

    const lateAppointmentAfter = await prisma.rendezVous.findUnique({
      where: { id: lateAppointment.id },
      select: { statut: true },
    });

    summary.test3LateCancellationRejected = {
      passed:
        lateCancellation.status === 400 &&
        String(lateCancellation.body?.message || '').toLowerCase().includes('only allowed') &&
        lateAppointmentAfter?.statut === 'EN_ATTENTE',
      status: lateCancellation.status,
      message: lateCancellation.body?.message,
      finalStatus: lateAppointmentAfter?.statut,
    };

    const allPassed = Object.values(summary).every((result) => result.passed);

    console.log(
      JSON.stringify(
        {
          ok: allPassed,
          summary,
        },
        null,
        2
      )
    );

    if (!allPassed) {
      process.exitCode = 1;
    }
  } finally {
    if (cleanup.appointmentIds.length) {
      await prisma.rendezVous.deleteMany({
        where: {
          id: {
            in: cleanup.appointmentIds,
          },
        },
      });
    }

    if (cleanup.unverifiedUserId) {
      await prisma.user.delete({
        where: { id: cleanup.unverifiedUserId },
      });
    }

    await prisma.$disconnect();
  }
};

run().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

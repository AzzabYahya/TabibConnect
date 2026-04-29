const { PrismaClient } = require('@prisma/client');
const env = require('../src/config/env');
const appointmentService = require('../src/services/appointmentService');

const prisma = new PrismaClient();
const BASE = 'http://127.0.0.1:4000';
const USER_AGENT = 'TabibConnect-E2E-Test';

const request = async (
  path,
  { method = 'GET', token, body, cookie, headers = {} } = {}
) => {
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

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${method} ${path} -> ${JSON.stringify(json)}`);
  }

  return { status: response.status, body: json, headers: response.headers };
};

const extractCookie = (setCookieValue) => {
  if (!setCookieValue) {
    return '';
  }

  return setCookieValue.split(';')[0];
};

const login = async (email, password) => {
  const csrf = await request('/api/auth/csrf-token');
  const csrfToken = csrf.body?.csrfToken;
  const csrfCookie = extractCookie(csrf.headers.get('set-cookie'));

  const loginResponse = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    cookie: csrfCookie,
    headers: {
      [env.csrfHeaderName]: csrfToken,
    },
  });

  return loginResponse.body.data;
};

const findDoctorByUserId = async (doctorUserId) => {
  const doctorsResponse = await request('/api/doctors');
  const doctors = doctorsResponse.body?.data || [];

  const doctor = doctors.find((item) => item.user?.id === doctorUserId);

  if (!doctor) {
    throw new Error('Doctor linked to authenticated user not found in /api/doctors');
  }

  return doctor;
};

const findNextSlot = async (doctorId) => {
  for (let offset = 0; offset < 35; offset += 1) {
    const date = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
    const dateISO = date.toISOString().slice(0, 10);

    const availabilityResponse = await request(
      `/api/doctors/${doctorId}/availabilities?date=${dateISO}`
    );

    const availabilities = availabilityResponse.body?.data?.availabilities || [];

    for (const availability of availabilities) {
      for (const slot of availability.slots || []) {
        const start = new Date(slot.start);
        if (start.getTime() > Date.now() + 60 * 1000) {
          return {
            doctorId,
            disponibiliteId: availability.disponibiliteId,
            cabinetId: availability.cabinet?.id || null,
            dateHeure: slot.start,
          };
        }
      }
    }
  }

  throw new Error('No future slot found in the next 35 days');
};

const run = async () => {
  const startedAt = new Date();

  const patientAuth = await login(
    'youssef.benali@tabibconnect.ma',
    'TabibConnect@2026'
  );
  const doctorAuth = await login(
    'dr.amine.fassi@tabibconnect.ma',
    'TabibConnect@2026'
  );

  const doctor = await findDoctorByUserId(doctorAuth.user.id);

  const slot1 = await findNextSlot(doctor.id);
  const create1 = await request('/api/appointments', {
    method: 'POST',
    token: patientAuth.accessToken,
    body: {
      doctorId: slot1.doctorId,
      disponibiliteId: slot1.disponibiliteId,
      cabinetId: slot1.cabinetId,
      motif: 'Controle cardiologique preventif',
      typeConsultation: 'PRESENTIEL',
      notes: 'Test Etape 5 appointment 1',
      dateHeure: slot1.dateHeure,
    },
  });

  const appointment1Id = create1.body?.data?.id;

  await request(`/api/appointments/${appointment1Id}/confirm`, {
    method: 'PUT',
    token: doctorAuth.accessToken,
  });

  await prisma.rendezVous.update({
    where: { id: appointment1Id },
    data: {
      statut: 'CONFIRME',
      rappelEnvoye: false,
      dateHeure: new Date(Date.now() + env.reminderHoursBefore * 60 * 60 * 1000),
    },
  });

  const remindersProcessed = await appointmentService.process24hReminders();

  await prisma.rendezVous.update({
    where: { id: appointment1Id },
    data: {
      statut: 'CONFIRME',
      rappelEnvoye: true,
      dateHeure: new Date(Date.now() - (env.noShowGraceMinutes + 10) * 60 * 1000),
    },
  });

  const noShowProcessed = await appointmentService.processNoShowUpdates();

  const appointment1AfterNoShow = await prisma.rendezVous.findUnique({
    where: { id: appointment1Id },
    select: {
      statut: true,
      noShowAt: true,
    },
  });

  const slot2 = await findNextSlot(doctor.id);
  const create2 = await request('/api/appointments', {
    method: 'POST',
    token: patientAuth.accessToken,
    body: {
      doctorId: slot2.doctorId,
      disponibiliteId: slot2.disponibiliteId,
      cabinetId: slot2.cabinetId,
      motif: 'Suivi tension arterielle',
      typeConsultation: 'PRESENTIEL',
      notes: 'Test Etape 5 appointment 2',
      dateHeure: slot2.dateHeure,
    },
  });

  const appointment2Id = create2.body?.data?.id;

  await request(`/api/appointments/${appointment2Id}/confirm`, {
    method: 'PUT',
    token: doctorAuth.accessToken,
  });

  await request(`/api/appointments/${appointment2Id}/complete`, {
    method: 'PUT',
    token: doctorAuth.accessToken,
  });

  const slot3 = await findNextSlot(doctor.id);
  const create3 = await request('/api/appointments', {
    method: 'POST',
    token: patientAuth.accessToken,
    body: {
      doctorId: slot3.doctorId,
      disponibiliteId: slot3.disponibiliteId,
      cabinetId: slot3.cabinetId,
      motif: 'Consultation de suivi',
      typeConsultation: 'PRESENTIEL',
      notes: 'Test Etape 5 appointment 3',
      dateHeure: slot3.dateHeure,
    },
  });

  const appointment3Id = create3.body?.data?.id;

  const cancel3 = await request(`/api/appointments/${appointment3Id}/cancel`, {
    method: 'PUT',
    token: patientAuth.accessToken,
    body: {
      reason: 'Imprevu personnel',
    },
  });

  const upcomingPatient = await request('/api/appointments/upcoming', {
    token: patientAuth.accessToken,
  });

  const notificationStats = await prisma.notification.groupBy({
    by: ['type'],
    where: {
      userId: {
        in: [patientAuth.user.id, doctorAuth.user.id],
      },
      createdAt: {
        gte: startedAt,
      },
    },
    _count: {
      _all: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        doctorId: doctor.id,
        appointments: {
          appointment1: {
            id: appointment1Id,
            finalStatus: appointment1AfterNoShow?.statut,
            noShowAt: appointment1AfterNoShow?.noShowAt,
          },
          appointment2: {
            id: appointment2Id,
            finalStatus: 'COMPLETE',
          },
          appointment3: {
            id: appointment3Id,
            finalStatus: cancel3.body?.data?.appointment?.statut,
            freeCancellation: cancel3.body?.data?.freeCancellation,
          },
        },
        cron: {
          remindersProcessed,
          noShowProcessed,
        },
        upcomingPatientCount: (upcomingPatient.body?.data || []).length,
        notificationStats,
      },
      null,
      2
    )
  );
};

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

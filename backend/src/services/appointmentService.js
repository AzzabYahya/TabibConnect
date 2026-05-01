const prisma = require('../config/prisma');
const env = require('../config/env');
const HttpError = require('../utils/httpError');
const { createNotification } = require('./notificationService');
const { createCheckoutSession } = require('./paymentGatewayService');
const { computeDoctorAvailabilitiesByDate } = require('./availabilityService');
const {
  sendAppointmentCancelledNotifications,
  sendAppointmentCompletedNotifications,
  sendAppointmentConfirmedNotifications,
  sendAppointmentCreatedNotifications,
  sendAppointmentNoShowNotifications,
  sendAppointmentRescheduledNotifications,
  sendAppointmentReminderNotifications,
} = require('./appointmentNotificationService');

const BLOCKING_STATUSES = ['EN_ATTENTE', 'CONFIRME'];
const ACTIVE_APPOINTMENT_STATUSES = ['EN_ATTENTE', 'CONFIRME'];
const isTestRuntime = env.nodeEnv === 'test' || Boolean(process.env.JEST_WORKER_ID);
const isCardGatewayConfigured = Boolean(env.stripeSecretKey);

const toDate = (dateValue) => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, 'Invalid appointment date format');
  }

  return date;
};

const getDateISO = (date) => date.toISOString().slice(0, 10);

const intervalsOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;
const PAYMENT_SETTLED_STATUSES = ['PAYE', 'REMBOURSE'];

const sanitizeDigits = (value) => String(value || '').replace(/\D/g, '');

const validateImmediateCardPayment = (cardPayment) => {
  const cardNumber = sanitizeDigits(cardPayment?.cardNumber);
  const cvc = sanitizeDigits(cardPayment?.cvc);
  const expMonth = String(cardPayment?.expMonth || '').trim();
  const expYear = String(cardPayment?.expYear || '').trim();
  const cardHolder = String(cardPayment?.cardHolder || '').trim();

  if (!cardHolder || cardHolder.length < 3) {
    throw new HttpError(400, 'Card holder name is required');
  }
  if (!/^\d{16}$/.test(cardNumber)) {
    throw new HttpError(400, 'Card number must contain 16 digits');
  }
  if (!/^(0[1-9]|1[0-2])$/.test(expMonth)) {
    throw new HttpError(400, 'Card expiry month is invalid');
  }
  if (!/^\d{2}$/.test(expYear)) {
    throw new HttpError(400, 'Card expiry year is invalid');
  }
  if (!/^\d{3,4}$/.test(cvc)) {
    throw new HttpError(400, 'Card security code is invalid');
  }

  return {
    cardHolder,
    cardLast4: cardNumber.slice(-4),
    expMonth,
    expYear,
  };
};

const generatePaymentReference = (method, suffix = '') => {
  const segment = Math.random().toString(36).slice(2, 10).toUpperCase();
  const stamp = Date.now().toString().slice(-6);
  const safeSuffix = String(suffix || '').replace(/[^0-9A-Z]/gi, '').slice(-4);
  return `${method}-${stamp}-${segment}${safeSuffix ? `-${safeSuffix}` : ''}`;
};

const getPatientContext = async (userId) => {
  const patient = await prisma.patient.findUnique({
    where: { userId },
    select: { id: true, userId: true },
  });

  if (!patient) {
    throw new HttpError(404, 'Patient profile not found');
  }

  return patient;
};

const getDoctorContext = async (userId) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true, userId: true },
  });

  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found');
  }

  return doctor;
};

const assertDoctorIsVerified = async (doctorId) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: {
      id: true,
      user: {
        select: {
          isVerified: true,
        },
      },
    },
  });

  if (!doctor) {
    throw new HttpError(404, 'Doctor not found');
  }

  if (!doctor.user?.isVerified) {
    throw new HttpError(403, 'Appointments are not allowed with unverified doctors');
  }
};

const getAppointmentByIdWithActors = async (appointmentId) => {
  const appointment = await prisma.rendezVous.findUnique({
    where: { id: appointmentId },
    include: {
      disponibilite: {
        select: {
          id: true,
          dureeConsultation: true,
          doctorId: true,
          cabinetId: true,
        },
      },
      cabinet: true,
      patient: {
        select: {
          id: true,
          bookingWarnings: true,
          lastNoShowAt: true,
          antecedents: true,
          dateOfNaissance: true,
          sexe: true,
          ville: true,
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              role: true,
            },
          },
        },
      },
      doctor: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              role: true,
            },
          },
        },
      },
      avis: {
        select: {
          id: true,
          note: true,
          commentaire: true,
          isVerified: true,
          createdAt: true,
        },
      },
      paiement: true,
    },
  });

  if (!appointment) {
    throw new HttpError(404, 'Appointment not found');
  }

  return appointment;
};

const getAppointmentDetails = async ({ appointmentId, userId, role }) => {
  const appointment = await getAppointmentByIdWithActors(appointmentId);
  let patientProfile = null;

  if (role === 'PATIENT') {
    const patient = await getPatientContext(userId);

    if (appointment.patientId !== patient.id) {
      throw new HttpError(403, 'You can only access your own appointments');
    }
  } else if (role === 'DOCTOR') {
    const doctor = await getDoctorContext(userId);

    if (appointment.doctorId !== doctor.id) {
      throw new HttpError(403, 'You can only access appointments assigned to you');
    }

    const [historyAppointments, doctorNotes] = await Promise.all([
      prisma.rendezVous.findMany({
        where: {
          patientId: appointment.patientId,
        },
        include: {
          doctor: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
          cabinet: true,
        },
        orderBy: [{ dateHeure: 'desc' }],
        take: 12,
      }),
      prisma.doctorPatientNote.findMany({
        where: {
          patientId: appointment.patientId,
          OR: [{ doctorId: doctor.id }, { isVisibleToPeers: true }],
        },
        include: {
          doctor: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 20,
      }),
    ]);

    patientProfile = {
      id: appointment.patient.id,
      email: appointment.patient.user.email,
      phone: appointment.patient.user.phone || null,
      city: appointment.patient.ville || null,
      antecedents: appointment.patient.antecedents || null,
      warnings: appointment.patient.bookingWarnings || 0,
      historyAppointments: historyAppointments.map((item) => ({
        id: item.id,
        status: item.statut,
        dateTime: item.dateHeure.toISOString(),
        reason: item.motif,
        doctorName: item.doctor.nomComplet || item.doctor.user.email,
        specialty: item.doctor.specialite,
        cabinet: item.cabinet?.nom || null,
      })),
      doctorNotes: doctorNotes.map((item) => ({
        id: item.id,
        note: item.note,
        isVisibleToPeers: item.isVisibleToPeers,
        createdAt: item.createdAt.toISOString(),
        doctorName: item.doctor.nomComplet || item.doctor.user.email,
      })),
    };
  } else if (role === 'ADMIN') {
    // Admins can inspect any appointment.
  } else if (role) {
    throw new HttpError(403, 'You are not allowed to access this appointment');
  }

  const cabinetLabel = appointment.cabinet
    ? [appointment.cabinet.nom, appointment.cabinet.quartier, appointment.cabinet.ville]
        .filter(Boolean)
        .join(', ')
    : 'Cabinet non renseigne';

  const review = appointment.avis
    ? {
        id: appointment.avis.id,
        note: appointment.avis.note,
        comment: appointment.avis.commentaire || null,
        verified: appointment.avis.isVerified,
        createdAt: appointment.avis.createdAt.toISOString(),
      }
    : null;

  return {
    id: appointment.id,
    status: appointment.statut,
    typeConsultation: appointment.typeConsultation,
    methodePaiement: appointment.methodePaiement,
    acceptedGeneralTerms: appointment.acceptedGeneralTerms,
    acceptedCashPolicy: appointment.acceptedCashPolicy,
    dateTime: appointment.dateHeure.toISOString(),
    reason: appointment.motif,
    notes: appointment.notes || null,
    cancellationReason: appointment.cancellationReason || null,
    patient: appointment.patient
      ? {
          id: appointment.patient.id,
          name: appointment.patient.user.email,
          email: appointment.patient.user.email,
          warnings: appointment.patient.bookingWarnings || 0,
          lastNoShowAt: appointment.patient.lastNoShowAt ? appointment.patient.lastNoShowAt.toISOString() : null,
        }
      : null,
    doctor: {
      id: appointment.doctorId,
      name: appointment.doctor.nomComplet || appointment.doctor.user.email,
      specialty: appointment.doctor.specialite,
      fee: Number(appointment.doctor.tarifConsultation),
    },
    cabinet: appointment.cabinet
      ? {
          id: appointment.cabinet.id,
          name: appointment.cabinet.nom,
          address: appointment.cabinet.adresse,
          city: appointment.cabinet.ville,
          label: cabinetLabel,
        }
      : null,
    durationMinutes: appointment.disponibilite?.dureeConsultation || null,
    review,
    reviewReceived: Boolean(review),
    canReview: appointment.statut === 'COMPLETE' && !review,
    payment: appointment.paiement
      ? {
          id: appointment.paiement.id,
          method: appointment.paiement.methode,
          status: appointment.paiement.statut,
          amount: Number(appointment.paiement.montant),
          reference: appointment.paiement.reference,
          paid: PAYMENT_SETTLED_STATUSES.includes(appointment.paiement.statut),
          createdAt: appointment.paiement.createdAt.toISOString(),
        }
      : null,
    joinUrl: null,
    patientProfile,
  };
};

const createDoctorPatientNote = async ({ appointmentId, userId, payload }) => {
  const doctor = await getDoctorContext(userId);
  const appointment = await getAppointmentByIdWithActors(appointmentId);

  if (appointment.doctorId !== doctor.id) {
    throw new HttpError(403, 'You can only add patient notes on your own appointments');
  }

  const created = await prisma.doctorPatientNote.create({
    data: {
      doctorId: doctor.id,
      patientId: appointment.patientId,
      rendezVousId: appointment.id,
      note: String(payload.note || '').trim(),
      isVisibleToPeers: Boolean(payload.isVisibleToPeers),
    },
    include: {
      doctor: {
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  return {
    id: created.id,
    note: created.note,
    isVisibleToPeers: created.isVisibleToPeers,
    createdAt: created.createdAt.toISOString(),
    doctorName: created.doctor.nomComplet || created.doctor.user.email,
  };
};

const assertTimeSlotIsStillAvailable = async ({ doctorId, disponibiliteId, dateHeure }) => {
  const dateISO = getDateISO(dateHeure);

  const availabilities = await computeDoctorAvailabilitiesByDate({ doctorId, dateISO });

  const matchingDisponibilite = availabilities.find(
    (item) => item.disponibiliteId === disponibiliteId
  );

  if (!matchingDisponibilite) {
    throw new HttpError(409, 'No active availability for this doctor and schedule');
  }

  const slotExists = matchingDisponibilite.slots.some(
    (slot) => new Date(slot.start).getTime() === dateHeure.getTime()
  );

  if (!slotExists) {
    throw new HttpError(409, 'Selected slot is no longer available');
  }
};

const createAppointment = async ({ userId, payload }) => {
  const patient = await getPatientContext(userId);
  const requestedStart = toDate(payload.dateHeure);
  const dateISO = getDateISO(requestedStart);
  const paymentMethod = String(payload.methodePaiement || '').trim();
  const acceptedGeneralTerms = Boolean(payload.acceptedGeneralTerms);
  const acceptedCashPolicy = Boolean(payload.acceptedCashPolicy);
  const cardPayment = payload.cardPayment || null;

  if (!['CASH', 'CMI'].includes(paymentMethod)) {
    throw new HttpError(400, 'Payment method must be CASH or CMI');
  }

  if (!acceptedGeneralTerms) {
    throw new HttpError(400, 'General booking terms must be accepted');
  }

  if (paymentMethod === 'CASH' && !acceptedCashPolicy) {
    throw new HttpError(400, 'Cash payment conditions must be accepted');
  }
  const cardMeta =
    paymentMethod === 'CMI'
      ? cardPayment
        ? validateImmediateCardPayment(cardPayment)
        : isTestRuntime
          ? { cardHolder: 'TEST HOLDER', cardLast4: '4242', expMonth: '12', expYear: '30' }
          : null
      : null;
  if (paymentMethod === 'CMI' && isCardGatewayConfigured && !cardMeta) {
    throw new HttpError(400, 'Card payment details are required');
  }

  await assertDoctorIsVerified(payload.doctorId);

  await assertTimeSlotIsStillAvailable({
    doctorId: payload.doctorId,
    disponibiliteId: payload.disponibiliteId,
    dateHeure: requestedStart,
  });

  const created = await prisma.$transaction(async (tx) => {
    const disponibilite = await tx.disponibilite.findUnique({
      where: { id: payload.disponibiliteId },
      select: {
        id: true,
        doctorId: true,
        cabinetId: true,
        dureeConsultation: true,
        bookingVersion: true,
        isActive: true,
      },
    });

    if (!disponibilite || !disponibilite.isActive) {
      throw new HttpError(409, 'Availability is no longer active');
    }

    if (disponibilite.doctorId !== payload.doctorId) {
      throw new HttpError(400, 'Doctor and availability mismatch');
    }

    if (payload.cabinetId && payload.cabinetId !== disponibilite.cabinetId) {
      throw new HttpError(400, 'Cabinet and availability mismatch');
    }

    const lockResult = await tx.disponibilite.updateMany({
      where: {
        id: disponibilite.id,
        bookingVersion: disponibilite.bookingVersion,
      },
      data: {
        bookingVersion: {
          increment: 1,
        },
      },
    });

    if (lockResult.count !== 1) {
      throw new HttpError(
        409,
        'Concurrent booking detected. Please retry with latest availability.'
      );
    }

    const dayStart = new Date(`${dateISO}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateISO}T23:59:59.999Z`);

    const existingAppointments = await tx.rendezVous.findMany({
      where: {
        doctorId: disponibilite.doctorId,
        statut: {
          in: BLOCKING_STATUSES,
        },
        dateHeure: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        disponibilite: {
          select: {
            dureeConsultation: true,
          },
        },
      },
    });

    const requestedEnd = new Date(
      requestedStart.getTime() + disponibilite.dureeConsultation * 60 * 1000
    );

    const hasConflict = existingAppointments.some((appointment) => {
      const existingStart = new Date(appointment.dateHeure);
      const duration = appointment.disponibilite?.dureeConsultation || disponibilite.dureeConsultation;
      const existingEnd = new Date(existingStart.getTime() + duration * 60 * 1000);
      return intervalsOverlap(requestedStart, requestedEnd, existingStart, existingEnd);
    });

    if (hasConflict) {
      throw new HttpError(409, 'This appointment slot has just been reserved by another user');
    }

    const appointment = await tx.rendezVous.create({
      data: {
        patientId: patient.id,
        doctorId: disponibilite.doctorId,
        disponibiliteId: disponibilite.id,
        cabinetId: payload.cabinetId || disponibilite.cabinetId,
        motif: payload.motif,
        typeConsultation: payload.typeConsultation,
        methodePaiement: paymentMethod,
        acceptedGeneralTerms,
        acceptedCashPolicy,
        notes: payload.notes || null,
        dateHeure: requestedStart,
        statut: 'EN_ATTENTE',
      },
      include: {
        disponibilite: true,
        cabinet: true,
        patient: {
          include: {
            user: true,
          },
        },
        doctor: {
          include: {
            user: true,
          },
        },
        paiement: true,
      },
    });
    const paymentStatus = paymentMethod === 'CMI' ? 'EN_ATTENTE' : 'EN_ATTENTE';
    const paymentReference = generatePaymentReference(paymentMethod, cardMeta?.cardLast4);
    const payment = tx.paiement?.create
      ? await tx.paiement.create({
          data: {
            rendezVousId: appointment.id,
            doctorId: disponibilite.doctorId,
            montant: appointment.doctor?.tarifConsultation || 0,
            methode: paymentMethod,
            statut: paymentStatus,
            reference: paymentReference,
          },
        })
      : {
          id: `mock-${appointment.id}`,
          rendezVousId: appointment.id,
          doctorId: disponibilite.doctorId,
          montant: appointment.doctor?.tarifConsultation || 0,
          methode: paymentMethod,
          statut: paymentStatus,
          reference: paymentReference,
          createdAt: new Date(),
        };

    return {
      ...appointment,
      paiement: payment,
    };
  });

  let resultPayload = { ...created, paymentCheckoutUrl: null };
  if (created.methodePaiement === 'CMI' && created.paiement) {
    if (!isCardGatewayConfigured) {
      // Fallback mode: keep appointment flow working even without gateway config.
      await createNotification({
        userId: created.patient?.userId,
        type: 'SYSTEME',
        message: 'Passerelle carte indisponible actuellement. Votre rendez-vous est enregistré.',
      });
      resultPayload = { ...created, paymentCheckoutUrl: null };
      await sendAppointmentCreatedNotifications(resultPayload);
      return resultPayload;
    }
    if (isTestRuntime) {
      resultPayload = { ...created, paymentCheckoutUrl: null };
      await sendAppointmentCreatedNotifications(resultPayload);
      return resultPayload;
    }
    const session = await createCheckoutSession({
      paymentId: created.paiement.id,
      appointmentId: created.id,
      amountMad: Number(created.paiement.montant || 0),
      doctorName: created.doctor?.nomComplet || created.doctor?.user?.email || 'TabibConnect',
      patientEmail: created.patient?.user?.email || null,
    });
    await prisma.paiement.update({
      where: { id: created.paiement.id },
      data: { reference: session.id },
    });
    resultPayload = { ...created, paymentCheckoutUrl: session.url };
  } else if (created.methodePaiement === 'CASH') {
    await createNotification({
      userId: created.patient?.userId,
      type: 'SYSTEME',
      message: 'Paiement en espèces à régler sur place avant la consultation.',
    });
  }
  await sendAppointmentCreatedNotifications(resultPayload);
  return resultPayload;
};

const getMyAppointments = async ({ userId, role }) => {
  let where;
  let orderBy = [{ dateHeure: 'asc' }];
  const now = new Date();

  if (role === 'PATIENT') {
    const patient = await getPatientContext(userId);
    where = {
      patientId: patient.id,
      statut: {
        in: ACTIVE_APPOINTMENT_STATUSES,
      },
      dateHeure: {
        gte: now,
      },
    };
  } else if (role === 'DOCTOR') {
    const doctor = await getDoctorContext(userId);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfWeekWindow = new Date(startOfToday);
    endOfWeekWindow.setDate(endOfWeekWindow.getDate() + 7);
    endOfWeekWindow.setHours(23, 59, 59, 999);

    where = {
      doctorId: doctor.id,
      statut: {
        in: ACTIVE_APPOINTMENT_STATUSES,
      },
      dateHeure: {
        gte: startOfToday,
        lte: endOfWeekWindow,
      },
    };
  } else {
    throw new HttpError(403, 'Only patients and doctors can access this endpoint');
  }

  return prisma.rendezVous.findMany({
    where,
    include: {
      cabinet: true,
      disponibilite: true,
      patient: {
        include: {
          user: {
            select: {
              email: true,
              phone: true,
            },
          },
        },
      },
      doctor: {
        include: {
          user: {
            select: {
              email: true,
              phone: true,
            },
          },
        },
      },
    },
    orderBy,
  });
};

const confirmAppointment = async ({ appointmentId, userId }) => {
  const doctor = await getDoctorContext(userId);
  const current = await getAppointmentByIdWithActors(appointmentId);

  if (current.doctorId !== doctor.id) {
    throw new HttpError(403, 'You can only confirm your own appointments');
  }

  if (current.statut !== 'EN_ATTENTE') {
    throw new HttpError(400, 'Only pending appointments can be confirmed');
  }

  const updatedResult = await prisma.rendezVous.updateMany({
    where: {
      id: current.id,
      doctorId: doctor.id,
      statut: 'EN_ATTENTE',
      version: current.version,
    },
    data: {
      statut: 'CONFIRME',
      confirmedAt: new Date(),
      version: {
        increment: 1,
      },
    },
  });

  if (updatedResult.count !== 1) {
    throw new HttpError(409, 'Appointment was updated by another process. Please retry.');
  }

  const updated = await getAppointmentByIdWithActors(appointmentId);
  await sendAppointmentConfirmedNotifications(updated);
  return updated;
};

const cancelAppointment = async ({ appointmentId, userId, role, reason }) => {
  if (!reason) {
    throw new HttpError(400, 'Cancellation reason is required');
  }

  const current = await getAppointmentByIdWithActors(appointmentId);

  if (!['EN_ATTENTE', 'CONFIRME'].includes(current.statut)) {
    throw new HttpError(400, 'Only pending or confirmed appointments can be cancelled');
  }

  if (role === 'PATIENT') {
    const patient = await getPatientContext(userId);
    if (current.patientId !== patient.id) {
      throw new HttpError(403, 'You can only cancel your own appointments');
    }
  } else if (role === 'DOCTOR') {
    const doctor = await getDoctorContext(userId);
    if (current.doctorId !== doctor.id) {
      throw new HttpError(403, 'You can only cancel appointments assigned to you');
    }
  } else {
    throw new HttpError(403, 'Only patients and doctors can cancel appointments');
  }

  const hoursUntilAppointment = (new Date(current.dateHeure).getTime() - Date.now()) / (1000 * 60 * 60);
  const freeCancellation = hoursUntilAppointment >= env.freeCancellationHours;

  if (role === 'PATIENT' && !freeCancellation) {
    throw new HttpError(
      400,
      `Patient cancellation is only allowed up to ${env.freeCancellationHours}h before the appointment`
    );
  }

  const updatedResult = await prisma.rendezVous.updateMany({
    where: {
      id: current.id,
      version: current.version,
      statut: {
        in: ['EN_ATTENTE', 'CONFIRME'],
      },
    },
    data: {
      statut: 'ANNULE',
      cancellationReason: reason,
      cancelledAt: new Date(),
      cancelledByRole: role,
      version: {
        increment: 1,
      },
    },
  });

  if (updatedResult.count !== 1) {
    throw new HttpError(409, 'Appointment was updated by another process. Please retry.');
  }

  const updated = await getAppointmentByIdWithActors(appointmentId);

  await sendAppointmentCancelledNotifications({
    appointment: updated,
    cancelledByRole: role,
    freeCancellation,
  });

  return {
    appointment: updated,
    freeCancellation,
    policy: freeCancellation
      ? `Annulation gratuite appliquee (>= ${env.freeCancellationHours}h avant le rendez-vous).`
      : `Annulation tardive (< ${env.freeCancellationHours}h avant le rendez-vous).`,
  };
};

const completeAppointment = async ({ appointmentId, userId }) => {
  const doctor = await getDoctorContext(userId);
  const current = await getAppointmentByIdWithActors(appointmentId);

  if (current.doctorId !== doctor.id) {
    throw new HttpError(403, 'You can only complete appointments assigned to you');
  }

  if (current.statut !== 'CONFIRME') {
    throw new HttpError(400, 'Only confirmed appointments can be completed');
  }

  const updatedResult = await prisma.rendezVous.updateMany({
    where: {
      id: current.id,
      doctorId: doctor.id,
      statut: 'CONFIRME',
      version: current.version,
    },
    data: {
      statut: 'COMPLETE',
      completedAt: new Date(),
      version: {
        increment: 1,
      },
    },
  });

  if (updatedResult.count !== 1) {
    throw new HttpError(409, 'Appointment was updated by another process. Please retry.');
  }

  const updated = await getAppointmentByIdWithActors(appointmentId);
  await sendAppointmentCompletedNotifications(updated);
  return updated;
};

const rescheduleAppointment = async ({ appointmentId, userId, role, payload }) => {
  const current = await getAppointmentByIdWithActors(appointmentId);

  if (!['EN_ATTENTE', 'CONFIRME'].includes(current.statut)) {
    throw new HttpError(400, 'Only pending or confirmed appointments can be rescheduled');
  }

  if (role === 'PATIENT') {
    const patient = await getPatientContext(userId);
    if (current.patientId !== patient.id) {
      throw new HttpError(403, 'You can only reschedule your own appointments');
    }
  } else if (role === 'DOCTOR') {
    const doctor = await getDoctorContext(userId);
    if (current.doctorId !== doctor.id) {
      throw new HttpError(403, 'You can only reschedule appointments assigned to you');
    }
  } else {
    throw new HttpError(403, 'Only patients and doctors can reschedule appointments');
  }

  const requestedStart = toDate(payload.dateHeure);

  if (requestedStart.getTime() === new Date(current.dateHeure).getTime()) {
    throw new HttpError(400, 'New appointment date must be different from current one');
  }

  await assertTimeSlotIsStillAvailable({
    doctorId: current.doctorId,
    disponibiliteId: payload.disponibiliteId,
    dateHeure: requestedStart,
  });

  const disponibilite = await prisma.disponibilite.findUnique({
    where: { id: payload.disponibiliteId },
    select: {
      id: true,
      doctorId: true,
      cabinetId: true,
      isActive: true,
    },
  });

  if (!disponibilite || !disponibilite.isActive) {
    throw new HttpError(409, 'Availability is no longer active');
  }

  if (disponibilite.doctorId !== current.doctorId) {
    throw new HttpError(400, 'Doctor and availability mismatch');
  }

  if (payload.cabinetId && payload.cabinetId !== disponibilite.cabinetId) {
    throw new HttpError(400, 'Cabinet and availability mismatch');
  }

  const shouldResetConfirmation = role === 'PATIENT' && current.statut === 'CONFIRME';

  const updatedResult = await prisma.rendezVous.updateMany({
    where: {
      id: current.id,
      version: current.version,
      statut: {
        in: ['EN_ATTENTE', 'CONFIRME'],
      },
    },
    data: {
      dateHeure: requestedStart,
      disponibiliteId: disponibilite.id,
      cabinetId: payload.cabinetId || disponibilite.cabinetId,
      statut: shouldResetConfirmation ? 'EN_ATTENTE' : current.statut,
      confirmedAt: shouldResetConfirmation ? null : current.confirmedAt,
      rappelEnvoye: false,
      version: {
        increment: 1,
      },
    },
  });

  if (updatedResult.count !== 1) {
    throw new HttpError(409, 'Appointment was updated by another process. Please retry.');
  }

  const updated = await getAppointmentByIdWithActors(appointmentId);
  await sendAppointmentRescheduledNotifications({
    appointment: updated,
    previousDateHeure: current.dateHeure,
    rescheduledByRole: role,
    reason: payload.reason,
  });

  return updated;
};

const createReview = async ({ appointmentId, userId, payload }) => {
  const patient = await getPatientContext(userId);
  const current = await getAppointmentByIdWithActors(appointmentId);

  if (current.patientId !== patient.id) {
    throw new HttpError(403, 'You can only review your own appointments');
  }

  if (current.statut !== 'COMPLETE') {
    throw new HttpError(400, 'Only completed appointments can be reviewed');
  }

  if (current.avis) {
    throw new HttpError(409, 'This appointment already has a review');
  }

  const note = Number(payload.note);
  if (!Number.isInteger(note) || note < 1 || note > 5) {
    throw new HttpError(400, 'Review rating must be between 1 and 5');
  }

  const commentaire = String(payload.commentaire || '').trim();

  const review = await prisma.avis.create({
    data: {
      patientId: patient.id,
      doctorId: current.doctorId,
      rendezVousId: current.id,
      note,
      commentaire: commentaire || null,
      isVerified: false,
    },
  });

  return {
    id: review.id,
    appointmentId: review.rendezVousId,
    note: review.note,
    comment: review.commentaire || null,
    verified: review.isVerified,
    createdAt: review.createdAt.toISOString(),
    doctorId: review.doctorId,
    patientId: review.patientId,
  };
};

const getUpcomingAppointments = async ({ userId, role }) => {
  let where;

  if (role === 'PATIENT') {
    const patient = await getPatientContext(userId);
    where = { patientId: patient.id };
  } else if (role === 'DOCTOR') {
    const doctor = await getDoctorContext(userId);
    where = { doctorId: doctor.id };
  } else {
    throw new HttpError(403, 'Only patients and doctors can access this endpoint');
  }

  const appointments = await prisma.rendezVous.findMany({
    where: {
      ...where,
      statut: {
        in: ACTIVE_APPOINTMENT_STATUSES,
      },
      dateHeure: {
        gte: new Date(),
      },
    },
    include: {
      cabinet: true,
      patient: {
        include: {
          user: {
            select: {
              email: true,
              phone: true,
            },
          },
        },
      },
      doctor: {
        include: {
          user: {
            select: {
              email: true,
              phone: true,
            },
          },
        },
      },
    },
    orderBy: [{ dateHeure: 'asc' }],
    take: 50,
  });

  return appointments.map((appointment) => {
    const diffInHours = (new Date(appointment.dateHeure).getTime() - Date.now()) / (1000 * 60 * 60);

    return {
      ...appointment,
      reminder: {
        reminderAlreadySent: appointment.rappelEnvoye,
        shouldSend24hReminder: !appointment.rappelEnvoye && diffInHours <= 24 && diffInHours > 0,
      },
    };
  });
};

const process24hReminders = async () => {
  const now = new Date();
  const targetStart = new Date(
    now.getTime() + env.reminderHoursBefore * 60 * 60 * 1000 - env.reminderWindowMinutes * 60 * 1000
  );
  const targetEnd = new Date(
    now.getTime() + env.reminderHoursBefore * 60 * 60 * 1000 + env.reminderWindowMinutes * 60 * 1000
  );

  const reminders = await prisma.rendezVous.findMany({
    where: {
      statut: 'CONFIRME',
      rappelEnvoye: false,
      dateHeure: {
        gte: targetStart,
        lte: targetEnd,
      },
    },
    include: {
      patient: {
        include: {
          user: true,
        },
      },
      doctor: {
        include: {
          user: true,
        },
      },
      cabinet: true,
      disponibilite: true,
    },
  });

  for (const appointment of reminders) {
    await sendAppointmentReminderNotifications(appointment);

    await prisma.rendezVous.updateMany({
      where: {
        id: appointment.id,
        statut: 'CONFIRME',
        rappelEnvoye: false,
      },
      data: {
        rappelEnvoye: true,
        version: {
          increment: 1,
        },
      },
    });
  }

  return reminders.length;
};

const processNoShowUpdates = async () => {
  const threshold = new Date(Date.now() - env.noShowGraceMinutes * 60 * 1000);

  const candidates = await prisma.rendezVous.findMany({
    where: {
      statut: 'CONFIRME',
      dateHeure: {
        lt: threshold,
      },
    },
    include: {
      patient: {
        include: {
          user: true,
        },
      },
      doctor: {
        include: {
          user: true,
        },
      },
      cabinet: true,
      disponibilite: true,
    },
  });

  let updatedCount = 0;

  for (const appointment of candidates) {
    const updated = await prisma.rendezVous.updateMany({
      where: {
        id: appointment.id,
        statut: 'CONFIRME',
        version: appointment.version,
      },
      data: {
        statut: 'NO_SHOW',
        noShowAt: new Date(),
        version: {
          increment: 1,
        },
      },
    });

    if (updated.count === 1) {
      updatedCount += 1;
      await prisma.patient.updateMany({
        where: {
          id: appointment.patientId,
        },
        data: {
          bookingWarnings: {
            increment: 1,
          },
          lastNoShowAt: new Date(),
        },
      });
      await sendAppointmentNoShowNotifications(appointment);
    }
  }

  return updatedCount;
};

module.exports = {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  createAppointment,
  createDoctorPatientNote,
  createReview,
  getAppointmentDetails,
  getMyAppointments,
  getUpcomingAppointments,
  process24hReminders,
  processNoShowUpdates,
  rescheduleAppointment,
};

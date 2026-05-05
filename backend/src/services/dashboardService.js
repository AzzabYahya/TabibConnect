const prisma = require('../config/prisma');
const HttpError = require('../utils/httpError');

const APPOINTMENT_STATUSES = new Set(['EN_ATTENTE', 'CONFIRME']);

const bloodGroupLabels = {
  O_POS: 'O+',
  O_NEG: 'O-',
  A_POS: 'A+',
  A_NEG: 'A-',
  B_POS: 'B+',
  B_NEG: 'B-',
  AB_POS: 'AB+',
  AB_NEG: 'AB-',
};

const genderLabels = {
  HOMME: 'Homme',
  FEMME: 'Femme',
};

const notificationTitles = {
  RAPPEL_RDV: 'Rappel de rendez-vous',
  RDV_CONFIRME: 'Rendez-vous confirme',
  RDV_ANNULE: 'Rendez-vous annule',
  PAIEMENT_RECU: 'Paiement recu',
  SYSTEME: 'Information systeme',
};

const timeFormatter = new Intl.DateTimeFormat('fr-MA', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const buildRelativeLabel = (dateValue) => {
  const date = new Date(dateValue);
  const diffInMinutes = Math.round((Date.now() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) {
    return 'A l instant';
  }

  if (diffInMinutes < 60) {
    return `Il y a ${diffInMinutes} min`;
  }

  const diffInHours = Math.round(diffInMinutes / 60);

  if (diffInHours < 24) {
    return `Il y a ${diffInHours} h`;
  }

  return timeFormatter.format(date);
};

const toDisplayName = (email) => {
  const localPart = String(email || '')
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .trim();

  if (!localPart) {
    return 'Compte patient';
  }

  return localPart
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getPatientContext = async (userId) => {
  const patient = await prisma.patient.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          email: true,
          phone: true,
          isVerified: true,
          createdAt: true,
        },
      },
    },
  });

  if (!patient) {
    throw new HttpError(404, 'Patient profile not found');
  }

  return patient;
};

const getDoctorContext = async (userId) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          email: true,
          phone: true,
          isVerified: true,
          createdAt: true,
        },
      },
    },
  });

  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found');
  }

  return doctor;
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
    },
  });

  if (!appointment) {
    throw new HttpError(404, 'Appointment not found');
  }

  return appointment;
};

const getAppointmentDetails = async ({ appointmentId, userId, role }) => {
  const appointment = await getAppointmentByIdWithActors(appointmentId);

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
  } else if (role !== 'ADMIN') {
    throw new HttpError(403, 'You are not allowed to access this appointment');
  }

  const cabinetLabel = appointment.cabinet
    ? [appointment.cabinet.nom, appointment.cabinet.quartier, appointment.cabinet.ville]
        .filter(Boolean)
        .join(', ')
    : 'Cabinet non renseigne';

  return {
    id: appointment.id,
    status: appointment.statut,
    typeConsultation: appointment.typeConsultation,
    dateTime: appointment.dateHeure.toISOString(),
    reason: appointment.motif,
    notes: appointment.notes || null,
    cancellationReason: appointment.cancellationReason || null,
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
    joinUrl: null,
  };
};

const mapAppointment = (appointment, now) => {
  const doctorName = appointment.doctor.nomComplet || appointment.doctor.user.email;
  const cabinetName = appointment.cabinet?.nom || 'Cabinet non renseigne';
  const cabinetCity = appointment.cabinet?.ville || appointment.doctor.doctorCabinets?.[0]?.cabinet?.ville || 'Maroc';
  const cabinetLabel = [appointment.cabinet?.nom, appointment.cabinet?.quartier, appointment.cabinet?.ville]
    .filter(Boolean)
    .join(', ');
  const review = appointment.avis
    ? {
        rating: appointment.avis.note,
        comment: appointment.avis.commentaire || null,
      }
    : null;

  return {
    id: appointment.id,
    doctorId: appointment.doctorId,
    doctorName,
    specialty: appointment.doctor.specialite,
    dateTime: appointment.dateHeure.toISOString(),
    status: appointment.statut,
    statusLabel: appointment.statut,
    cabinet: cabinetName,
    cabinetLabel,
    city: cabinetCity,
    type: appointment.typeConsultation,
    reason: appointment.motif,
    note: appointment.notes || appointment.cancellationReason || '',
    price: Number(appointment.doctor.tarifConsultation),
    canRebook: appointment.statut !== 'EN_ATTENTE',
    canReview: appointment.statut === 'COMPLETE' && !review,
    reviewReceived: Boolean(review),
    review,
    durationMinutes: appointment.disponibilite?.dureeConsultation || null,
    isUpcoming: APPOINTMENT_STATUSES.has(appointment.statut) && new Date(appointment.dateHeure).getTime() >= now.getTime(),
  };
};

const mapNotification = (notification) => ({
  id: notification.id,
  type: notification.type,
  title: notificationTitles[notification.type] || 'Notification',
  body: notification.message,
  time: buildRelativeLabel(notification.createdAt),
  isRead: notification.isRead,
});

const getPatientDashboard = async ({ userId }) => {
  const patient = await getPatientContext(userId);
  const now = new Date();

  const [appointments, notifications] = await Promise.all([
    prisma.rendezVous.findMany({
      where: {
        patientId: patient.id,
      },
      include: {
        cabinet: true,
        disponibilite: {
          select: {
            dureeConsultation: true,
          },
        },
        doctor: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
            doctorCabinets: {
              include: {
                cabinet: {
                  select: {
                    ville: true,
                  },
                },
              },
            },
          },
        },
        avis: {
          select: {
            note: true,
            commentaire: true,
          },
        },
      },
      orderBy: [{ dateHeure: 'desc' }],
      take: 50,
    }),
    prisma.notification.findMany({
      where: {
        userId: patient.userId,
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 8,
    }),
  ]);

  const mappedAppointments = appointments.map((appointment) => mapAppointment(appointment, now));
  const upcomingAppointment = mappedAppointments
    .filter((appointment) => appointment.isUpcoming)
    .sort((left, right) => new Date(left.dateTime) - new Date(right.dateTime))[0] || null;

  const historyAppointments = mappedAppointments
    .filter((appointment) => !appointment.isUpcoming)
    .slice(0, 6)
    .map((appointment) => ({
      id: appointment.id,
      doctorName: appointment.doctorName,
      specialty: appointment.specialty,
      dateTime: appointment.dateTime,
      status: appointment.status,
      rating: appointment.review?.rating || null,
      canRebook: appointment.canRebook,
      canReview: appointment.canReview,
      reviewReceived: appointment.reviewReceived,
      note: appointment.note || appointment.review?.comment || 'Rendez-vous archive dans la base de donnees.',
      doctorId: appointment.doctorId,
      city: appointment.city,
    }));

  const favoriteDoctors = Object.values(
    mappedAppointments.reduce((accumulator, appointment) => {
      const key = appointment.doctorId;
      const existing = accumulator[key] || {
        id: appointment.doctorId,
        name: appointment.doctorName,
        specialty: appointment.specialty,
        city: appointment.city,
        count: 0,
        ratingTotal: 0,
        ratingCount: 0,
        latestVisit: null,
      };

      existing.count += 1;

      if (appointment.review?.rating) {
        existing.ratingTotal += Number(appointment.review.rating);
        existing.ratingCount += 1;
      }

      const appointmentDate = new Date(appointment.dateTime);

      if (!existing.latestVisit || appointmentDate > existing.latestVisit) {
        existing.latestVisit = appointmentDate;
      }

      accumulator[key] = existing;
      return accumulator;
    }, {})
  )
    .sort((left, right) => right.count - left.count || (right.latestVisit?.getTime() || 0) - (left.latestVisit?.getTime() || 0))
    .slice(0, 4)
    .map((doctor) => ({
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty,
      city: doctor.city,
      appointmentsCount: doctor.count,
      averageRating: doctor.ratingCount ? Number((doctor.ratingTotal / doctor.ratingCount).toFixed(1)) : null,
      lastVisit: doctor.latestVisit ? timeFormatter.format(doctor.latestVisit) : null,
    }));

  const unreadNotifications = notifications.filter((notification) => !notification.isRead).length;

  const age = patient.dateOfNaissance
    ? Math.max(0, Math.floor((now.getTime() - new Date(patient.dateOfNaissance).getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
    : null;

  return {
    patient: {
      displayName: toDisplayName(patient.user.email),
      email: patient.user.email,
      phone: patient.user.phone,
      cin: patient.cin,
      city: patient.ville,
      address: patient.adresse,
      age,
      gender: genderLabels[patient.sexe] || patient.sexe,
      bloodGroup: bloodGroupLabels[patient.groupeSanguin] || null,
      bookingWarnings: patient.bookingWarnings || 0,
      lastNoShowAt: patient.lastNoShowAt ? patient.lastNoShowAt.toISOString() : null,
    },
    summary: {
      upcomingAppointments: upcomingAppointment ? 1 : 0,
      historyCount: historyAppointments.length,
      favoriteDoctors: favoriteDoctors.length,
      unreadNotifications,
    },
    upcomingAppointment,
    historyAppointments,
    favoriteDoctors,
    notifications: notifications.map(mapNotification),
    medicalProfile: {
      cin: patient.cin,
      address: patient.adresse,
      city: patient.ville,
      dateOfBirth: patient.dateOfNaissance.toISOString().slice(0, 10),
      gender: genderLabels[patient.sexe] || patient.sexe,
      bloodGroup: bloodGroupLabels[patient.groupeSanguin] || null,
      antecedents: patient.antecedents || 'Aucun antecedent renseigne',
      notes: 'Dossier alimente depuis la base de donnees.',
      phone: patient.user.phone,
      email: patient.user.email,
      bookingWarnings: patient.bookingWarnings || 0,
      lastNoShowAt: patient.lastNoShowAt ? patient.lastNoShowAt.toISOString() : null,
    },
    reviewPrompt: historyAppointments.find((appointment) => appointment.canReview) || null,
  };
};

const getPatientHistory = async ({ userId, page = 1, limit = 20, status = 'ALL' }) => {
  const patient = await getPatientContext(userId);
  const now = new Date();
  const currentPage = Math.max(1, Number(page));
  const pageSize = Math.min(50, Math.max(1, Number(limit)));
  const normalizedStatus = String(status || 'ALL').toUpperCase();

  const where = {
    patientId: patient.id,
    ...(normalizedStatus !== 'ALL' ? { statut: normalizedStatus } : {}),
  };

  const [appointments, total] = await Promise.all([
    prisma.rendezVous.findMany({
      where,
      include: {
        cabinet: true,
        disponibilite: { select: { dureeConsultation: true } },
        doctor: { include: { user: { select: { email: true } }, doctorCabinets: { include: { cabinet: { select: { ville: true } } } } } },
        avis: { select: { note: true, commentaire: true } },
      },
      orderBy: [{ dateHeure: 'desc' }],
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.rendezVous.count({ where }),
  ]);

  const mapped = appointments.map((appointment) => mapAppointment(appointment, now));
  return {
    items: mapped.map((appointment) => ({
      id: appointment.id,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName,
      specialty: appointment.specialty,
      dateTime: appointment.dateTime,
      status: appointment.status,
      type: appointment.type,
      city: appointment.city,
      rating: appointment.review?.rating || null,
      canReview: appointment.canReview,
      reviewReceived: appointment.reviewReceived,
    })),
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasNextPage: currentPage * pageSize < total,
      hasPrevPage: currentPage > 1,
    },
  };
};

const getPatientRecurringDoctors = async ({ userId }) => {
  const patient = await getPatientContext(userId);
  const appointments = await prisma.rendezVous.findMany({
    where: { patientId: patient.id },
    select: { doctorId: true },
  });
  const counts = appointments.reduce((acc, a) => {
    acc[a.doctorId] = (acc[a.doctorId] || 0) + 1;
    return acc;
  }, {});
  const recurringIds = Object.entries(counts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id]) => id);

  const doctors = await prisma.doctor.findMany({
    where: { id: { in: recurringIds } },
    include: { user: { select: { email: true } } },
  });

  return recurringIds.map((id) => {
    const d = doctors.find((x) => x.id === id);
    return d
      ? { id: d.id, name: d.nomComplet || toDisplayName(d.user.email), specialty: d.specialite, count: counts[id] }
      : { id, name: 'Médecin', specialty: null, count: counts[id] };
  });
};

const getPatientNotifications = async ({ userId, page = 1, limit = 20 }) => {
  const patient = await getPatientContext(userId);
  const currentPage = Math.max(1, Number(page));
  const pageSize = Math.min(50, Math.max(1, Number(limit)));

  const where = { userId: patient.userId };
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    items: notifications.map(mapNotification),
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasNextPage: currentPage * pageSize < total,
      hasPrevPage: currentPage > 1,
    },
  };
};

const markPatientNotificationsRead = async ({ userId }) => {
  const patient = await getPatientContext(userId);
  const result = await prisma.notification.updateMany({
    where: { userId: patient.userId, isRead: false },
    data: { isRead: true },
  });
  return { updated: result.count };
};

const getPatientProfileManagement = async ({ userId }) => {
  const patient = await getPatientContext(userId);

  // Get patient profile data
  const patientData = await prisma.patient.findUnique({
    where: { id: patient.id },
    select: {
      id: true,
      adresse: true,
      ville: true,
      groupeSanguin: true,
      antecedents: true,
    },
  });

  // Get patient change requests
  const changeRequests = await prisma.patientChangeRequest.findMany({
    where: { patientId: patient.id },
    orderBy: { createdAt: 'desc' },
  });

  // Get patient profile photo URL (latest profile photo document)
  const latestProfilePhoto = await prisma.patientDocument.findFirst({
    where: { patientId: patient.id, isProfilePhoto: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fileName: true,
      filePath: true,
    },
  });

  const profilePhotoUrl = latestProfilePhoto ? `/api/patients/${patient.id}/profile-photo` : null;

  return {
    profile: patientData,
    changeRequests,
    profilePhotoUrl,
  };
};

module.exports = {
  getAppointmentDetails,
  getPatientDashboard,
  getPatientProfileManagement,
  getPatientHistory,
  getPatientRecurringDoctors,
  getPatientNotifications,
  markPatientNotificationsRead,
};
const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { Prisma } = require('@prisma/client');
const HttpError = require('../utils/httpError');
const env = require('../config/env');
const { sendMail } = require('./emailService');
const { sendSms } = require('./smsService');
const { verifyCinDocument } = require('./cinVerificationService');

const toDisplayName = (email) => {
  const localPart = String(email || '')
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .trim();

  return localPart
    ? localPart
        .split(' ')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : 'Utilisateur';
};

const parseCoordinate = (value, fieldName) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    throw new HttpError(400, `${fieldName} is required`);
  }
  const normalized = String(value).replace(',', '.').trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new HttpError(400, `${fieldName} must be a valid number`);
  }
  return parsed;
};

const requireStringField = (value, fieldName) => {
  const parsed = String(value || '').trim();
  if (!parsed) {
    throw new HttpError(400, `${fieldName} is required`);
  }
  return parsed;
};

const toStoredDocumentRef = (file) => ({
  fileName: file?.originalname || null,
  filePath: file?.path || null,
  mimeType: file?.mimetype || null,
  size: Number.isFinite(file?.size) ? Number(file.size) : null,
  uploadedAt: file ? new Date() : null,
});

const getAdminDashboard = async () => {
  const [pendingDoctors, pendingReviews, pendingDoctorChanges, totalDoctors, verifiedDoctors, totalPatients, totalAppointments, totalReviews, recentAppointments, recentNotifications, accounts, appointmentLinks] =
    await Promise.all([
      prisma.doctor.findMany({
        where: {
          user: {
            isVerified: false,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              createdAt: true,
            },
          },
          doctorCabinets: {
            include: {
              cabinet: {
                select: {
                  id: true,
                  nom: true,
                  ville: true,
                  quartier: true,
                },
              },
            },
          },
          documents: {
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              size: true,
              createdAt: true,
            },
          },
        },
        orderBy: [{ createdAt: 'asc' }],
        take: 20,
      }),
      prisma.avis.findMany({
        where: {
          isVerified: false,
        },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
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
      prisma.doctorChangeRequest.findMany({
        where: {
          status: 'PENDING',
        },
        include: {
          doctor: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'asc' }],
        take: 50,
      }),
      prisma.doctor.count(),
      prisma.user.count({
        where: {
          role: 'DOCTOR',
          isVerified: true,
        },
      }),
      prisma.patient.count(),
      prisma.rendezVous.count(),
      prisma.avis.count(),
      prisma.rendezVous.findMany({
        orderBy: [{ createdAt: 'desc' }],
        take: 5,
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
          patient: {
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
      }),
      prisma.notification.findMany({
        orderBy: [{ createdAt: 'desc' }],
        take: 5,
        include: {
          user: {
            select: {
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.user.findMany({
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          isVerified: true,
          createdAt: true,
          lastLoginAt: true,
          patient: {
            select: {
              cin: true,
              cinDocumentFileName: true,
              cinDocumentFilePath: true,
              cinDocumentMimeType: true,
              cinDocumentSize: true,
              cinDocumentUploadedAt: true,
              cinDocumentVerificationStatus: true,
              cinDocumentVerificationScore: true,
              cinDocumentVerificationNote: true,
              cinDocumentVerifiedAt: true,
              cinDocumentRejectedAt: true,
              ville: true,
              sexe: true,
              dateOfNaissance: true,
              bookingWarnings: true,
              lastNoShowAt: true,
            },
          },
          doctor: {
            select: {
              nomComplet: true,
              specialite: true,
              inpe: true,
              cinDocumentFileName: true,
              cinDocumentFilePath: true,
              cinDocumentMimeType: true,
              cinDocumentSize: true,
              cinDocumentUploadedAt: true,
              cinDocumentVerificationStatus: true,
              cinDocumentVerificationScore: true,
              cinDocumentVerificationNote: true,
              cinDocumentVerifiedAt: true,
              cinDocumentRejectedAt: true,
              experience: true,
              languesParlees: true,
              accepteAssurance: true,
              tarifConsultation: true,
            },
          },
          _count: {
            select: {
              notifications: true,
            },
          },
        },
      }),
      prisma.rendezVous.findMany({
        where: {
          statut: {
            in: ['CONFIRME', 'COMPLETE'],
          },
        },
        select: {
          id: true,
          dateHeure: true,
          motif: true,
          statut: true,
          patientId: true,
          doctorId: true,
          patient: {
            select: {
              userId: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
          doctor: {
            select: {
              userId: true,
              nomComplet: true,
              specialite: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
        orderBy: [{ dateHeure: 'desc' }],
        take: 500,
      }),
    ]);

  const completedAppointments = await prisma.rendezVous.count({
    where: {
      statut: 'COMPLETE',
    },
  });

  const platformSignals = [
    {
      label: 'Medecins verifies',
      value: verifiedDoctors,
      detail: 'Comptes medecins actifs et validés',
    },
    {
      label: 'Medecins en attente',
      value: pendingDoctors.length,
      detail: 'Dossiers a examiner',
    },
    {
      label: 'Avis a verifier',
      value: pendingReviews.length,
      detail: 'Avis encore non validates',
    },
    {
      label: 'RDV completes',
      value: completedAppointments,
      detail: 'Consultations terminees',
    },
  ];

  const verificationQueue = pendingDoctors.map((doctor) => ({
    id: doctor.id,
    doctorId: doctor.id,
    name: doctor.nomComplet || toDisplayName(doctor.user.email),
    specialty: doctor.specialite,
    city: doctor.doctorCabinets[0]?.cabinet?.ville || 'Maroc',
    inpe: doctor.inpe,
    submittedAt: doctor.user.createdAt,
    documents: doctor.documents.map((document) => ({
      label: document.fileName,
      status: 'A verifier',
    })),
    cinDocument: doctor.cinDocumentFileName
      ? {
          fileName: doctor.cinDocumentFileName,
          filePath: doctor.cinDocumentFilePath,
          mimeType: doctor.cinDocumentMimeType,
          size: doctor.cinDocumentSize,
          uploadedAt: doctor.cinDocumentUploadedAt,
          verificationStatus: doctor.cinDocumentVerificationStatus,
          verificationScore: doctor.cinDocumentVerificationScore,
          verificationNote: doctor.cinDocumentVerificationNote,
          verifiedAt: doctor.cinDocumentVerifiedAt,
          rejectedAt: doctor.cinDocumentRejectedAt,
        }
      : null,
    cabinets: doctor.doctorCabinets.map((entry) => entry.cabinet.nom),
    requestDetails: {
      email: doctor.user.email,
      phone: doctor.user.phone,
      fullName: doctor.nomComplet || toDisplayName(doctor.user.email),
      inpe: doctor.inpe,
      specialty: doctor.specialite,
      experience: doctor.experience,
      fee: Number(doctor.tarifConsultation || 0),
      acceptsInsurance: doctor.accepteAssurance,
      insuranceList: doctor.assurancesAcceptees || [],
      languages: doctor.languesParlees || [],
      diplomas: doctor.diplomes || [],
      bio: doctor.bio || '',
      cabinets: doctor.doctorCabinets.map((entry) => ({
        id: entry.cabinet.id,
        name: entry.cabinet.nom,
        city: entry.cabinet.ville,
        district: entry.cabinet.quartier,
      })),
      uploadedDocuments: doctor.documents.map((document) => ({
        id: document.id,
        fileName: document.fileName,
        mimeType: document.mimeType,
        size: document.size,
        uploadedAt: document.createdAt,
      })),
    },
  }));

  const reviewQueue = pendingReviews.map((review) => ({
    id: review.id,
    doctorName: review.doctor.nomComplet || toDisplayName(review.doctor.user.email),
    doctorId: review.doctorId,
    patientName: toDisplayName(review.patient.user.email),
    rating: review.note,
    comment: review.commentaire || '',
    createdAt: review.createdAt,
    verified: review.isVerified,
    status: review.isVerified ? 'VALIDE' : 'EN_ATTENTE',
  }));

  const doctorChangeRequests = pendingDoctorChanges.map((request) => ({
    id: request.id,
    doctorId: request.doctorId,
    doctorName: request.doctor.nomComplet || toDisplayName(request.doctor.user.email),
    doctorEmail: request.doctor.user.email,
    type: request.type,
    reason: request.reason,
    payload: request.payload,
    createdAt: request.createdAt,
    status: request.status,
  }));

  const activityLog = [
    ...recentAppointments.map((appointment) => {
      const doctorName = appointment.doctor.nomComplet || toDisplayName(appointment.doctor.user.email);
      const patientName = toDisplayName(appointment.patient.user.email);
      return `Rendez-vous ${appointment.statut.toLowerCase()} pour ${patientName} avec ${doctorName}.`;
    }),
    ...recentNotifications.map((notification) => `Notification ${notification.type} envoyee a ${notification.user.email}.`),
  ].slice(0, 6);

  const doctorPatientLinks = appointmentLinks.reduce((accumulator, appointment) => {
    if (!appointment.doctor?.userId || !appointment.patient?.userId) {
      return accumulator;
    }
    const key = appointment.doctor.userId;
    const list = accumulator[key] || [];
    list.push({
      appointmentId: appointment.id,
      patientUserId: appointment.patient.userId,
      patientName: toDisplayName(appointment.patient.user.email),
      dateTime: appointment.dateHeure,
      reason: appointment.motif,
      status: appointment.statut,
    });
    accumulator[key] = list;
    return accumulator;
  }, {});

  const patientDoctorLinks = appointmentLinks.reduce((accumulator, appointment) => {
    if (!appointment.doctor?.userId || !appointment.patient?.userId) {
      return accumulator;
    }
    const key = appointment.patient.userId;
    const list = accumulator[key] || [];
    list.push({
      appointmentId: appointment.id,
      doctorUserId: appointment.doctor.userId,
      doctorName: appointment.doctor.nomComplet || toDisplayName(appointment.doctor.user.email),
      specialty: appointment.doctor.specialite,
      dateTime: appointment.dateHeure,
      reason: appointment.motif,
      status: appointment.statut,
    });
    accumulator[key] = list;
    return accumulator;
  }, {});

  return {
    summary: {
      totalDoctors,
      verifiedDoctors,
      pendingDoctors: pendingDoctors.length,
      totalPatients,
      totalAppointments,
      totalReviews,
      pendingReviews: pendingReviews.length,
      completedAppointments,
    },
    accounts: accounts.map((account) => ({
      id: account.id,
      email: account.email,
      phone: account.phone,
      role: account.role,
      isVerified: account.isVerified,
      createdAt: account.createdAt,
      lastLoginAt: account.lastLoginAt,
      patient: account.patient,
      doctor: account.doctor
        ? {
            nomComplet: account.doctor.nomComplet,
            specialite: account.doctor.specialite,
            inpe: account.doctor.inpe,
            cinDocumentFileName: account.doctor.cinDocumentFileName,
            cinDocumentFilePath: account.doctor.cinDocumentFilePath,
            cinDocumentMimeType: account.doctor.cinDocumentMimeType,
            cinDocumentSize: account.doctor.cinDocumentSize,
            cinDocumentUploadedAt: account.doctor.cinDocumentUploadedAt,
            cinDocumentVerificationStatus: account.doctor.cinDocumentVerificationStatus,
            cinDocumentVerificationScore: account.doctor.cinDocumentVerificationScore,
            cinDocumentVerificationNote: account.doctor.cinDocumentVerificationNote,
            cinDocumentVerifiedAt: account.doctor.cinDocumentVerifiedAt,
            cinDocumentRejectedAt: account.doctor.cinDocumentRejectedAt,
            experience: account.doctor.experience,
            languesParlees: account.doctor.languesParlees,
            accepteAssurance: account.doctor.accepteAssurance,
            tarifConsultation: account.doctor.tarifConsultation,
          }
        : null,
      notificationsCount: account._count.notifications,
      consultedPatients: (doctorPatientLinks[account.id] || []).slice(0, 12),
      consultedDoctors: (patientDoctorLinks[account.id] || []).slice(0, 12),
    })),
    verificationQueue,
    reviewQueue,
    doctorChangeRequests,
    platformSignals,
    activityLog,
  };
};

const getAdminAccountDetails = async ({ userId }) => {
  const account = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patient: true,
      doctor: true,
      notifications: {
        orderBy: [{ createdAt: 'desc' }],
        take: 20,
      },
    },
  });

  if (!account) {
    throw new HttpError(404, 'Account not found');
  }

  const [patientAppointments, doctorAppointments] = await Promise.all([
    account.patient
      ? prisma.rendezVous.findMany({
          where: { patientId: account.patient.id },
          include: {
            doctor: {
              include: {
                user: {
                  select: { email: true },
                },
              },
            },
            cabinet: true,
          },
          orderBy: [{ dateHeure: 'desc' }],
          take: 30,
        })
      : [],
    account.doctor
      ? prisma.rendezVous.findMany({
          where: { doctorId: account.doctor.id },
          include: {
            patient: {
              include: {
                user: {
                  select: { email: true },
                },
              },
            },
            cabinet: true,
          },
          orderBy: [{ dateHeure: 'desc' }],
          take: 30,
        })
      : [],
  ]);

  return {
    account: {
      id: account.id,
      email: account.email,
      phone: account.phone,
      role: account.role,
      isVerified: account.isVerified,
      createdAt: account.createdAt,
      lastLoginAt: account.lastLoginAt,
      patient: account.patient,
      doctor: account.doctor,
    },
    notifications: account.notifications.map((item) => ({
      id: item.id,
      type: item.type,
      message: item.message,
      isRead: item.isRead,
      createdAt: item.createdAt,
    })),
    consultedDoctors: patientAppointments.map((item) => ({
      appointmentId: item.id,
      doctorName: item.doctor.nomComplet || toDisplayName(item.doctor.user.email),
      specialty: item.doctor.specialite,
      city: item.cabinet?.ville || 'Maroc',
      status: item.statut,
      dateTime: item.dateHeure,
      reason: item.motif,
    })),
    consultedPatients: doctorAppointments.map((item) => ({
      appointmentId: item.id,
      patientName: toDisplayName(item.patient.user.email),
      city: item.cabinet?.ville || 'Maroc',
      status: item.statut,
      dateTime: item.dateHeure,
      reason: item.motif,
    })),
  };
};

const notifyAccount = async ({ userId, channel, subject, message }) => {
  if (!message || !String(message).trim()) {
    throw new HttpError(400, 'Message is required');
  }

  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
    },
  });

  if (!account) {
    throw new HttpError(404, 'Account not found');
  }

  const selectedChannel = String(channel || '').toLowerCase();
  if (!['email', 'sms', 'both'].includes(selectedChannel)) {
    throw new HttpError(400, 'channel must be email, sms, or both');
  }

  const tasks = [];
  if (selectedChannel === 'email' || selectedChannel === 'both') {
    tasks.push(
      sendMail({
        to: account.email,
        subject: subject || 'TabibConnect - Notification admin',
        html: `<p>${String(message).replace(/\n/g, '<br/>')}</p>`,
      })
    );
  }

  if (selectedChannel === 'sms' || selectedChannel === 'both') {
    tasks.push(
      sendSms({
        to: account.phone,
        body: String(message),
      })
    );
  }

  const results = await Promise.all(tasks);
  return {
    userId: account.id,
    channel: selectedChannel,
    results,
  };
};

const verifyDoctor = async ({ doctorId }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      user: true,
    },
  });

  if (!doctor) {
    throw new HttpError(404, 'Doctor not found');
  }

  await prisma.user.update({
    where: { id: doctor.userId },
    data: { isVerified: true },
  });

  return {
    id: doctor.id,
    name: doctor.nomComplet || toDisplayName(doctor.user.email),
    verified: true,
  };
};

const verifyReview = async ({ reviewId }) => {
  const review = await prisma.avis.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new HttpError(404, 'Review not found');
  }

  const updated = await prisma.avis.update({
    where: { id: reviewId },
    data: { isVerified: true },
  });

  return {
    id: updated.id,
    verified: updated.isVerified,
  };
};

const approveDoctorChangeRequest = async ({ requestId, adminUserId, reviewNote }) => {
  const request = await prisma.doctorChangeRequest.findUnique({
    where: { id: requestId },
    include: {
      doctor: {
        include: {
          doctorCabinets: true,
        },
      },
    },
  });

  if (!request) {
    throw new HttpError(404, 'Doctor change request not found');
  }
  if (request.status !== 'PENDING') {
    throw new HttpError(400, 'Request is already reviewed');
  }

  const data = request.payload || {};
  if (request.type === 'PROFILE_UPDATE') {
    await prisma.doctor.update({
      where: { id: request.doctorId },
      data: {
        nomComplet: data.nomComplet ?? undefined,
        specialite: data.specialite ?? undefined,
        diplomes: Array.isArray(data.diplomes) ? data.diplomes : undefined,
        languesParlees: Array.isArray(data.languesParlees) ? data.languesParlees : undefined,
        tarifConsultation: data.tarifConsultation !== undefined ? Number(data.tarifConsultation) : undefined,
        bio: data.bio ?? undefined,
        experience: data.experience !== undefined ? Number(data.experience) : undefined,
      },
    });
  } else if (request.type === 'LOCATION_CREATE') {
    const latitude = parseCoordinate(data.latitude, 'latitude');
    const longitude = parseCoordinate(data.longitude, 'longitude');
    const cabinet = await prisma.cabinet.create({
      data: {
        nom: requireStringField(data.nom, 'nom'),
        adresse: requireStringField(data.adresse, 'adresse'),
        ville: requireStringField(data.ville, 'ville'),
        quartier: requireStringField(data.quartier, 'quartier'),
        latitude,
        longitude,
        phone: data.phone || '+212600000000',
        photos: [],
      },
    });
    await prisma.doctorCabinet.create({
      data: {
        doctorId: request.doctorId,
        cabinetId: cabinet.id,
      },
    });
  } else if (request.type === 'LOCATION_UPDATE') {
    const cabinetId = data.cabinetId;
    const relation = await prisma.doctorCabinet.findFirst({
      where: { doctorId: request.doctorId, cabinetId },
    });
    if (!relation) {
      throw new HttpError(400, 'Requested cabinet is not linked to this doctor');
    }
    await prisma.cabinet.update({
      where: { id: cabinetId },
      data: {
        nom: data.nom ?? undefined,
        adresse: data.adresse ?? undefined,
        ville: data.ville ?? undefined,
        quartier: data.quartier ?? undefined,
        latitude: data.latitude !== undefined ? parseCoordinate(data.latitude, 'latitude') : undefined,
        longitude: data.longitude !== undefined ? parseCoordinate(data.longitude, 'longitude') : undefined,
        phone: data.phone ?? undefined,
      },
    });
  }

  return prisma.doctorChangeRequest.update({
    where: { id: requestId },
    data: {
      status: 'APPROVED',
      reviewNote: reviewNote || null,
      reviewedByUserId: adminUserId,
      reviewedAt: new Date(),
    },
  });
};

const rejectDoctorChangeRequest = async ({ requestId, adminUserId, reviewNote }) => {
  const request = await prisma.doctorChangeRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true },
  });
  if (!request) {
    throw new HttpError(404, 'Doctor change request not found');
  }
  if (request.status !== 'PENDING') {
    throw new HttpError(400, 'Request is already reviewed');
  }
  return prisma.doctorChangeRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      reviewNote: reviewNote || null,
      reviewedByUserId: adminUserId,
      reviewedAt: new Date(),
    },
  });
};

const createAccountByAdmin = async ({ payload, cinDocumentFile }) => {
  const role = String(payload.role || '').toUpperCase();
  if (!['ADMIN', 'DOCTOR', 'PATIENT'].includes(role)) {
    throw new HttpError(400, 'Invalid role');
  }
  if (!payload.email || !payload.phone || !payload.password) {
    throw new HttpError(400, 'email, phone and password are required');
  }
  if (!cinDocumentFile) {
    throw new HttpError(400, 'National ID document is required');
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: payload.email }, { phone: payload.phone }],
    },
    select: { id: true },
  });
  if (existingUser) {
    throw new HttpError(409, 'Account with this email or phone already exists');
  }

  const hashedPassword = await bcrypt.hash(String(payload.password), env.bcryptSaltRounds);
  const cinDocumentRef = toStoredDocumentRef(cinDocumentFile);
  const cinVerification = env.cinVerificationEnabled
    ? await verifyCinDocument({
        file: cinDocumentFile,
        expectedCin: payload.cin || '',
      })
    : { status: 'PENDING', score: null, note: 'verification_disabled' };

  if (env.cinVerificationEnabled && env.cinVerificationStrict && cinVerification.status !== 'VERIFIED') {
    throw new HttpError(400, 'National ID verification failed');
  }

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: String(payload.email).trim(),
        phone: String(payload.phone).trim(),
        password: hashedPassword,
        role,
        isVerified: Boolean(payload.isVerified ?? true),
      },
    });

    if (role === 'PATIENT') {
      if (!payload.cin || !payload.dateOfNaissance || !payload.sexe || !payload.adresse || !payload.ville) {
        throw new HttpError(400, 'Patient fields cin, dateOfNaissance, sexe, adresse, ville are required');
      }
      await tx.patient.create({
        data: {
          userId: user.id,
          cin: String(payload.cin).trim(),
          cinDocumentFileName: cinDocumentRef.fileName,
          cinDocumentFilePath: cinDocumentRef.filePath,
          cinDocumentMimeType: cinDocumentRef.mimeType,
          cinDocumentSize: cinDocumentRef.size,
          cinDocumentUploadedAt: cinDocumentRef.uploadedAt,
          cinDocumentVerificationStatus: cinVerification.status,
          cinDocumentVerificationScore: cinVerification.score,
          cinDocumentVerificationNote: cinVerification.note,
          cinDocumentVerifiedAt: cinVerification.status === 'VERIFIED' ? new Date() : null,
          cinDocumentRejectedAt: cinVerification.status === 'REJECTED' ? new Date() : null,
          dateOfNaissance: new Date(payload.dateOfNaissance),
          sexe: payload.sexe,
          adresse: String(payload.adresse).trim(),
          ville: String(payload.ville).trim(),
          groupeSanguin: payload.groupeSanguin || null,
          antecedents: payload.antecedents || null,
        },
      });
    }

    if (role === 'DOCTOR') {
      if (!payload.inpe || !payload.specialite || payload.tarifConsultation === undefined || payload.experience === undefined) {
        throw new HttpError(400, 'Doctor fields inpe, specialite, tarifConsultation, experience are required');
      }
      await tx.doctor.create({
        data: {
          userId: user.id,
          inpe: String(payload.inpe).trim(),
          cinDocumentFileName: cinDocumentRef.fileName,
          cinDocumentFilePath: cinDocumentRef.filePath,
          cinDocumentMimeType: cinDocumentRef.mimeType,
          cinDocumentSize: cinDocumentRef.size,
          cinDocumentUploadedAt: cinDocumentRef.uploadedAt,
          cinDocumentVerificationStatus: cinVerification.status,
          cinDocumentVerificationScore: cinVerification.score,
          cinDocumentVerificationNote: cinVerification.note,
          cinDocumentVerifiedAt: cinVerification.status === 'VERIFIED' ? new Date() : null,
          cinDocumentRejectedAt: cinVerification.status === 'REJECTED' ? new Date() : null,
          nomComplet: payload.nomComplet || null,
          specialite: String(payload.specialite).trim(),
          diplomes: Array.isArray(payload.diplomes) ? payload.diplomes : [],
          languesParlees: Array.isArray(payload.languesParlees) ? payload.languesParlees : [],
          tarifConsultation: new Prisma.Decimal(payload.tarifConsultation),
          accepteAssurance: Boolean(payload.accepteAssurance),
          assurancesAcceptees: Array.isArray(payload.assurancesAcceptees) ? payload.assurancesAcceptees : [],
          bio: payload.bio || null,
          experience: Number(payload.experience),
        },
      });
    }

    return user;
  });

  return {
    id: created.id,
    email: created.email,
    phone: created.phone,
    role: created.role,
    isVerified: created.isVerified,
  };
};

module.exports = {
  getAdminDashboard,
  getAdminAccountDetails,
  notifyAccount,
  approveDoctorChangeRequest,
  rejectDoctorChangeRequest,
  createAccountByAdmin,
  verifyDoctor,
  verifyReview,
};

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

const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  return false;
};

const toStringList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
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

const getProfilePhotoFromDocuments = (documents = []) => {
  const images = (documents || []).filter((document) =>
    String(document.mimeType || '').startsWith('image/')
  );

  const flagged = images.filter((doc) => Boolean(doc.isProfilePhoto));
  if (flagged.length) {
    return flagged.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
  }

  return images.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] || null;
};

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
              id: true,
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
    userId: doctor.user.id,
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
    userId: request.doctor.user.id,
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
      patient: {
        include: {
          patientDocuments: {
            select: {
              id: true,
              fileName: true,
              filePath: true,
              mimeType: true,
              size: true,
              createdAt: true,
              isProfilePhoto: true,
            },
          },
        },
      },
      doctor: {
        include: {
          documents: {
            select: {
              id: true,
              fileName: true,
              filePath: true,
              mimeType: true,
              size: true,
              createdAt: true,
              isProfilePhoto: true,
            },
          },
        },
      },
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

  const documents = account.role === 'DOCTOR' 
    ? account.doctor?.documents 
    : account.patient?.patientDocuments;

  const profilePhoto = getProfilePhotoFromDocuments(documents || []);

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
      profilePhoto: profilePhoto
        ? {
            fileName: profilePhoto.fileName,
            filePath: profilePhoto.filePath,
            mimeType: profilePhoto.mimeType,
            uploadedAt: profilePhoto.createdAt,
          }
        : null,
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
      doctorUserId: item.doctor?.userId || null,
      doctorName: item.doctor.nomComplet || toDisplayName(item.doctor.user.email),
      specialty: item.doctor.specialite,
      city: item.cabinet?.ville || 'Maroc',
      status: item.statut,
      dateTime: item.dateHeure,
      reason: item.motif,
    })),
    consultedPatients: doctorAppointments.map((item) => ({
      appointmentId: item.id,
      patientUserId: item.patient?.userId || null,
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
      documents: {
        select: {
          id: true,
          fileName: true,
          filePath: true,
          mimeType: true,
          createdAt: true,
        },
      },
    },
  });

  if (!doctor) {
    throw new HttpError(404, 'Doctor not found');
  }
  const profilePhoto = getProfilePhotoFromDocuments(doctor.documents);
  if (!profilePhoto) {
    throw new HttpError(
      400,
      'Doctor profile photo is required before verification. Ask the doctor to upload an image.'
    );
  }

  await prisma.user.update({
    where: { id: doctor.userId },
    data: { isVerified: true },
  });

  return {
    id: doctor.id,
    name: doctor.nomComplet || toDisplayName(doctor.user.email),
    verified: true,
    profilePhoto: {
      fileName: profilePhoto.fileName,
      filePath: profilePhoto.filePath,
      mimeType: profilePhoto.mimeType,
    },
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

const updateProfilePhotoByAdmin = async ({ userId, file }) => {
  if (!file) {
    throw new HttpError(400, 'File is required');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { doctor: true, patient: true },
  });

  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  if (user.role === 'DOCTOR' && user.doctor) {
    // Unmark previous profile photos
    await prisma.doctorDocument.updateMany({
      where: { doctorId: user.doctor.id, isProfilePhoto: true },
      data: { isProfilePhoto: false },
    });

    // Create new profile photo
    const document = await prisma.doctorDocument.create({
      data: {
        doctorId: user.doctor.id,
        fileName: file.originalname,
        filePath: file.path,
        mimeType: file.mimetype,
        size: file.size,
        isProfilePhoto: true,
      },
    });
    return document;
  } else if (user.role === 'PATIENT' && user.patient) {
    // Unmark previous profile photos
    await prisma.patientDocument.updateMany({
      where: { patientId: user.patient.id, isProfilePhoto: true },
      data: { isProfilePhoto: false },
    });

    // Create new profile photo
    const document = await prisma.patientDocument.create({
      data: {
        patientId: user.patient.id,
        fileName: file.originalname,
        filePath: file.path,
        mimeType: file.mimetype,
        size: file.size,
        isProfilePhoto: true,
      },
    });
    return document;
  }

  throw new HttpError(400, 'User role not supported for profile photo update');
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
  } else if (request.type === 'PROFILE_PHOTO_UPDATE') {
    const documentId = data.documentId;
    if (!documentId) {
      throw new HttpError(400, 'documentId is required');
    }

    const document = await prisma.doctorDocument.findFirst({
      where: { id: documentId, doctorId: request.doctorId },
      select: { id: true, mimeType: true },
    });

    if (!document) {
      throw new HttpError(400, 'Requested document is not linked to this doctor');
    }

    if (!String(document.mimeType || '').startsWith('image/')) {
      throw new HttpError(400, 'Profile photo must be an image');
    }

    await prisma.$transaction(async (tx) => {
      await tx.doctorDocument.updateMany({
        where: { doctorId: request.doctorId, isProfilePhoto: true },
        data: { isProfilePhoto: false },
      });
      await tx.doctorDocument.update({
        where: { id: documentId },
        data: { isProfilePhoto: true },
      });
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

const clampPagination = ({ page = 1, limit = 20, maxLimit = 50 }) => {
  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);
  const safePage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, maxLimit) : 20;
  const skip = (safePage - 1) * safeLimit;
  return { page: safePage, limit: safeLimit, skip };
};

const getAdminUsers = async ({
  page,
  limit,
  role = 'ALL',
  search = '',
  city = 'ALL',
  status = 'ALL',
  sortBy = 'createdAt',
  sortDir = 'desc',
}) => {
  const { skip, page: safePage, limit: safeLimit } = clampPagination({ page, limit, maxLimit: 50 });
  const q = String(search || '').trim();
  const normalizedRole = String(role || 'ALL').toUpperCase();
  const normalizedCity = String(city || 'ALL').trim();
  const normalizedStatus = String(status || 'ALL').toUpperCase();
  const normalizedSortBy = String(sortBy || 'createdAt');
  const normalizedSortDir = String(sortDir || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

  const where = {
    ...(normalizedRole !== 'ALL' ? { role: normalizedRole } : {}),
    ...(normalizedStatus === 'ACTIVE' ? { isVerified: true } : {}),
    ...(normalizedStatus === 'INACTIVE' ? { isVerified: false } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { doctor: { nomComplet: { contains: q, mode: 'insensitive' } } },
            { patient: { cin: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
    ...(normalizedCity !== 'ALL'
      ? {
          OR: [
            { patient: { ville: { equals: normalizedCity, mode: 'insensitive' } } },
            {
              doctor: {
                doctorCabinets: {
                  some: {
                    cabinet: { ville: { equals: normalizedCity, mode: 'insensitive' } },
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const orderBy = (() => {
    switch (normalizedSortBy) {
      case 'email':
        return [{ email: normalizedSortDir }];
      case 'role':
        return [{ role: normalizedSortDir }, { createdAt: 'desc' }];
      case 'status':
        return [{ isVerified: normalizedSortDir }, { createdAt: 'desc' }];
      case 'name':
        return [{ doctor: { nomComplet: normalizedSortDir } }, { email: normalizedSortDir }];
      case 'createdAt':
      default:
        return [{ createdAt: normalizedSortDir }];
    }
  })();

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: safeLimit,
      include: {
        patient: { select: { id: true, ville: true, cin: true, dateOfNaissance: true, sexe: true, antecedents: true } },
        doctor: {
          include: {
            doctorCabinets: {
              include: { cabinet: { select: { ville: true, quartier: true, nom: true } } },
              take: 1,
            },
          },
        },
      },
    }),
  ]);

  return {
    items: items.map((user) => ({
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      name: user.doctor?.nomComplet || toDisplayName(user.email),
      city: user.patient?.ville || user.doctor?.doctorCabinets?.[0]?.cabinet?.ville || null,
      patient: user.patient,
      doctor: user.doctor
        ? {
            id: user.doctor.id,
            nomComplet: user.doctor.nomComplet,
            specialite: user.doctor.specialite,
            inpe: user.doctor.inpe,
            experience: user.doctor.experience,
          }
        : null,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      hasNextPage: skip + items.length < total,
      hasPrevPage: safePage > 1,
    },
  };
};

const getAdminLogs = async ({ page, limit, type = 'ALL' }) => {
  const { skip, page: safePage, limit: safeLimit } = clampPagination({ page, limit, maxLimit: 50 });
  const normalizedType = String(type || 'ALL').toUpperCase();

  const [total, notifications, appointments, payments, users] = await Promise.all([
    Promise.all([
      prisma.notification.count({ where: normalizedType === 'ALL' || normalizedType === 'NOTIFICATION' ? {} : { id: { equals: '__none__' } } }),
      prisma.rendezVous.count({ where: normalizedType === 'ALL' || normalizedType === 'RDV' ? {} : { id: { equals: '__none__' } } }),
      prisma.paiement.count({ where: normalizedType === 'ALL' || normalizedType === 'PAIEMENT' ? {} : { id: { equals: '__none__' } } }),
      prisma.user.count({ where: normalizedType === 'ALL' || normalizedType === 'AUTH' ? {} : { id: { equals: '__none__' } } }),
    ]).then((counts) => counts.reduce((acc, n) => acc + n, 0)),
    prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: normalizedType === 'ALL' || normalizedType === 'NOTIFICATION' ? 120 : 0,
      include: { user: { select: { email: true } } },
    }),
    prisma.rendezVous.findMany({
      orderBy: { updatedAt: 'desc' },
      take: normalizedType === 'ALL' || normalizedType === 'RDV' ? 120 : 0,
      include: { doctor: { select: { nomComplet: true } }, patient: { include: { user: { select: { email: true } } } } },
    }),
    prisma.paiement.findMany({
      orderBy: { updatedAt: 'desc' },
      take: normalizedType === 'ALL' || normalizedType === 'PAIEMENT' ? 120 : 0,
      include: { doctor: { select: { nomComplet: true } } },
    }),
    prisma.user.findMany({
      orderBy: { lastLoginAt: 'desc' },
      take: normalizedType === 'ALL' || normalizedType === 'AUTH' ? 120 : 0,
      select: { id: true, email: true, role: true, lastLoginAt: true, createdAt: true },
    }),
  ]);

  const merged = [
    ...notifications.map((n) => ({ id: `N-${n.id}`, type: 'NOTIFICATION', at: n.createdAt, label: `${n.type} -> ${n.user?.email || 'N/A'}` })),
    ...appointments.map((a) => ({ id: `R-${a.id}`, type: 'RDV', at: a.updatedAt, label: `${a.statut} • ${a.doctor?.nomComplet || 'Médecin'} / ${a.patient?.user?.email || 'Patient'}` })),
    ...payments.map((p) => ({ id: `P-${p.id}`, type: 'PAIEMENT', at: p.updatedAt, label: `${p.statut} • ${Number(p.montant)} MAD` })),
    ...users
      .filter((u) => u.lastLoginAt)
      .map((u) => ({ id: `A-${u.id}`, type: 'AUTH', at: u.lastLoginAt, label: `Connexion ${u.role} • ${u.email}` })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const items = merged.slice(skip, skip + safeLimit);
  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      hasNextPage: skip + items.length < total,
      hasPrevPage: safePage > 1,
    },
  };
};

const getAdminMetrics = async () => {
  const now = new Date();
  const eightWeeksAgo = new Date(now);
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 7 * 8);

  const [appointments, doctorsBySpecialty, usersByCity] = await Promise.all([
    prisma.rendezVous.findMany({
      where: { createdAt: { gte: eightWeeksAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.doctor.groupBy({ by: ['specialite'], _count: { _all: true } }),
    prisma.patient.groupBy({ by: ['ville'], _count: { _all: true } }),
  ]);

  const weekBuckets = {};
  appointments.forEach((entry) => {
    const date = new Date(entry.createdAt);
    const start = new Date(date);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    const key = start.toISOString().slice(0, 10);
    weekBuckets[key] = (weekBuckets[key] || 0) + 1;
  });

  return {
    appointmentsByWeek: Object.entries(weekBuckets).map(([week, count]) => ({ week, count })),
    specialtyDistribution: doctorsBySpecialty.map((row) => ({ name: row.specialite, value: row._count._all })),
    cityDistribution: usersByCity.map((row) => ({ city: row.ville, count: row._count._all })),
  };
};

const getAdminDoctors = async ({
  page,
  limit,
  status = 'ALL',
  search = '',
  sortBy = 'createdAt',
  sortDir = 'desc',
}) => {
  const { skip, page: safePage, limit: safeLimit } = clampPagination({ page, limit, maxLimit: 50 });
  const normalizedStatus = String(status || 'ALL').toUpperCase();
  const q = String(search || '').trim();
  const normalizedSortBy = String(sortBy || 'createdAt');
  const normalizedSortDir = String(sortDir || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

  const where = {
    ...(normalizedStatus === 'PENDING' ? { user: { isVerified: false } } : {}),
    ...(normalizedStatus === 'VERIFIED' ? { user: { isVerified: true } } : {}),
    ...(q
      ? {
          OR: [
            { inpe: { contains: q, mode: 'insensitive' } },
            { specialite: { contains: q, mode: 'insensitive' } },
            { nomComplet: { contains: q, mode: 'insensitive' } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const orderBy = (() => {
    switch (normalizedSortBy) {
      case 'name':
        return [{ nomComplet: normalizedSortDir }, { createdAt: 'desc' }];
      case 'email':
        return [{ user: { email: normalizedSortDir } }, { createdAt: 'desc' }];
      case 'createdAt':
      default:
        return [{ createdAt: normalizedSortDir }];
    }
  })();

  const [total, items] = await Promise.all([
    prisma.doctor.count({ where }),
    prisma.doctor.findMany({
      where,
      orderBy,
      skip,
      take: safeLimit,
      include: {
        user: { select: { id: true, email: true, phone: true, isVerified: true, createdAt: true } },
        doctorCabinets: {
          include: { cabinet: { select: { id: true, nom: true, ville: true, quartier: true, adresse: true } } },
        },
        documents: { select: { id: true, fileName: true, mimeType: true, size: true, createdAt: true } },
      },
    }),
  ]);

  return {
    items: items.map((doc) => ({
      id: doc.id,
      userId: doc.userId,
      name: doc.nomComplet || toDisplayName(doc.user.email),
      email: doc.user.email,
      phone: doc.user.phone,
      inpe: doc.inpe,
      specialty: doc.specialite,
      city: doc.doctorCabinets?.[0]?.cabinet?.ville || null,
      isVerified: doc.user.isVerified,
      createdAt: doc.createdAt,
      cinDocument: doc.cinDocumentFileName
        ? {
            fileName: doc.cinDocumentFileName,
            filePath: doc.cinDocumentFilePath,
            mimeType: doc.cinDocumentMimeType,
            size: doc.cinDocumentSize,
            uploadedAt: doc.cinDocumentUploadedAt,
            verificationStatus: doc.cinDocumentVerificationStatus,
            verificationScore: doc.cinDocumentVerificationScore,
            verificationNote: doc.cinDocumentVerificationNote,
          }
        : null,
      cabinets: (doc.doctorCabinets || []).map((entry) => entry.cabinet),
      documents: doc.documents || [],
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      hasNextPage: skip + items.length < total,
      hasPrevPage: safePage > 1,
    },
  };
};

const updateDoctorProfileByAdmin = async ({ doctorId, payload }) => {
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) {
    throw new HttpError(404, 'Doctor not found');
  }

  const data = {};

  if (payload.nomComplet !== undefined) {
    const trimmed = String(payload.nomComplet || '').trim();
    data.nomComplet = trimmed ? trimmed : null;
  }

  if (payload.specialite !== undefined) {
    data.specialite = requireStringField(payload.specialite, 'specialite');
  }

  if (payload.diplomes !== undefined) {
    data.diplomes = toStringList(payload.diplomes);
  }

  if (payload.languesParlees !== undefined) {
    data.languesParlees = toStringList(payload.languesParlees);
  }

  if (payload.tarifConsultation !== undefined) {
    const parsed = Number(payload.tarifConsultation);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new HttpError(400, 'tarifConsultation must be a positive number');
    }
    data.tarifConsultation = new Prisma.Decimal(parsed);
  }

  if (payload.experience !== undefined) {
    const parsed = Number(payload.experience);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new HttpError(400, 'experience must be a valid number');
    }
    data.experience = Math.round(parsed);
  }

  if (payload.accepteAssurance !== undefined) {
    data.accepteAssurance = toBoolean(payload.accepteAssurance);
  }

  if (payload.assurancesAcceptees !== undefined) {
    data.assurancesAcceptees = toStringList(payload.assurancesAcceptees);
  }

  if (payload.bio !== undefined) {
    const trimmed = String(payload.bio || '').trim();
    data.bio = trimmed ? trimmed : null;
  }

  const updated = await prisma.doctor.update({
    where: { id: doctorId },
    data,
  });

  return {
    id: updated.id,
    nomComplet: updated.nomComplet,
    specialite: updated.specialite,
    tarifConsultation: updated.tarifConsultation,
    experience: updated.experience,
    languesParlees: updated.languesParlees || [],
    diplomes: updated.diplomes || [],
    accepteAssurance: updated.accepteAssurance,
    assurancesAcceptees: updated.assurancesAcceptees || [],
    bio: updated.bio,
  };
};

const rejectDoctor = async ({ doctorId, reason }) => {
  const message = String(reason || '').trim();
  if (!message) {
    throw new HttpError(400, 'reason is required');
  }

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!doctor) {
    throw new HttpError(404, 'Doctor not found');
  }

  await prisma.doctor.update({
    where: { id: doctorId },
    data: {
      cinDocumentVerificationStatus: 'REJECTED',
      cinDocumentVerificationNote: message,
      cinDocumentRejectedAt: new Date(),
    },
  });
  await prisma.user.update({ where: { id: doctor.userId }, data: { isVerified: false } });

  return { id: doctorId, rejected: true };
};

const updatePatientProfileByAdmin = async ({ patientId, payload }) => {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    throw new HttpError(404, 'Patient not found');
  }

  const data = {};

  if (payload.adresse !== undefined) {
    const trimmed = String(payload.adresse || '').trim();
    data.adresse = trimmed ? trimmed : null;
  }

  if (payload.ville !== undefined) {
    const trimmed = String(payload.ville || '').trim();
    data.ville = trimmed ? trimmed : null;
  }

  if (payload.groupeSanguin !== undefined) {
    const trimmed = String(payload.groupeSanguin || '').trim();
    data.groupeSanguin = trimmed ? trimmed : null;
  }

  if (payload.antecedents !== undefined) {
    const trimmed = String(payload.antecedents || '').trim();
    data.antecedents = trimmed ? trimmed : null;
  }

  const updated = await prisma.patient.update({
    where: { id: patientId },
    data,
  });

  return {
    id: updated.id,
    adresse: updated.adresse,
    ville: updated.ville,
    groupeSanguin: updated.groupeSanguin,
    antecedents: updated.antecedents,
  };
};

const getAdminReviews = async ({ page, limit, status = 'PENDING', search = '' }) => {
  const { skip, page: safePage, limit: safeLimit } = clampPagination({ page, limit, maxLimit: 50 });
  const normalizedStatus = String(status || 'PENDING').toUpperCase();
  const q = String(search || '').trim();

  const where = {
    ...(normalizedStatus === 'PENDING' ? { isVerified: false } : {}),
    ...(normalizedStatus === 'VERIFIED' ? { isVerified: true } : {}),
    ...(q
      ? {
          OR: [
            { commentaire: { contains: q, mode: 'insensitive' } },
            { doctor: { nomComplet: { contains: q, mode: 'insensitive' } } },
            { doctor: { user: { email: { contains: q, mode: 'insensitive' } } } },
            { patient: { user: { email: { contains: q, mode: 'insensitive' } } } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.avis.count({ where }),
    prisma.avis.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: safeLimit,
      include: {
        patient: { include: { user: { select: { email: true } } } },
        doctor: { include: { user: { select: { email: true } } } },
      },
    }),
  ]);

  return {
    items: items.map((review) => ({
      id: review.id,
      rating: review.note,
      comment: review.commentaire || '',
      isVerified: review.isVerified,
      createdAt: review.createdAt,
      doctor: {
        id: review.doctorId,
        name: review.doctor?.nomComplet || toDisplayName(review.doctor?.user?.email),
        email: review.doctor?.user?.email || null,
        specialty: review.doctor?.specialite || null,
      },
      patient: {
        id: review.patientId,
        name: toDisplayName(review.patient?.user?.email),
        email: review.patient?.user?.email || null,
      },
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      hasNextPage: skip + items.length < total,
      hasPrevPage: safePage > 1,
    },
  };
};

const rejectReview = async ({ reviewId, reason }) => {
  const message = String(reason || '').trim();
  if (!message) {
    throw new HttpError(400, 'reason is required');
  }

  const review = await prisma.avis.findUnique({ where: { id: reviewId }, select: { id: true } });
  if (!review) {
    throw new HttpError(404, 'Review not found');
  }

  await prisma.avis.delete({ where: { id: reviewId } });
  return { id: reviewId, deleted: true, reason: message };
};

const getAdminNotifications = async ({ page, limit, isRead = 'ALL', search = '' }) => {
  const { skip, page: safePage, limit: safeLimit } = clampPagination({ page, limit, maxLimit: 50 });
  const normalizedIsRead = String(isRead || 'ALL').toUpperCase();
  const q = String(search || '').trim();

  const where = {
    ...(normalizedIsRead === 'READ' ? { isRead: true } : {}),
    ...(normalizedIsRead === 'UNREAD' ? { isRead: false } : {}),
    ...(q
      ? {
          OR: [
            { message: { contains: q, mode: 'insensitive' } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: safeLimit,
      include: { user: { select: { id: true, email: true, role: true } } },
    }),
  ]);

  return {
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt,
      user: n.user,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      hasNextPage: skip + items.length < total,
      hasPrevPage: safePage > 1,
    },
  };
};

const markNotificationsRead = async ({ ids }) => {
  const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!list.length) {
    throw new HttpError(400, 'ids is required');
  }
  const result = await prisma.notification.updateMany({
    where: { id: { in: list } },
    data: { isRead: true },
  });
  return { updated: result.count };
};

const disableUser = async ({ userId }) => {
  const account = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!account) {
    throw new HttpError(404, 'Account not found');
  }
  await prisma.user.update({ where: { id: userId }, data: { isVerified: false } });
  return { id: userId, disabled: true };
};

const deleteUser = async ({ userId }) => {
  const account = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      doctor: { select: { id: true } },
      patient: { select: { id: true } },
    },
  });

  if (!account) {
    throw new HttpError(404, 'Account not found');
  }

  if (account.doctor) {
    const hasAppointments = await prisma.rendezVous.count({ where: { doctorId: account.doctor.id } });
    if (hasAppointments > 0) {
      throw new HttpError(400, 'Cannot delete a doctor with appointments. Disable the account instead.');
    }
  }

  if (account.patient) {
    const hasAppointments = await prisma.rendezVous.count({ where: { patientId: account.patient.id } });
    if (hasAppointments > 0) {
      throw new HttpError(400, 'Cannot delete a patient with appointments. Disable the account instead.');
    }
  }

  await prisma.user.delete({ where: { id: userId } });
  return { id: userId, deleted: true };
};

const getAdminAppointments = async ({ page, limit, status = 'ALL', search = '' }) => {
  const { skip, page: safePage, limit: safeLimit } = clampPagination({ page, limit, maxLimit: 50 });
  const normalizedStatus = String(status || 'ALL').toUpperCase();
  const q = String(search || '').trim();

  const where = {
    ...(normalizedStatus !== 'ALL' ? { statut: normalizedStatus } : {}),
    ...(q
      ? {
          OR: [
            { id: { contains: q, mode: 'insensitive' } },
            { motif: { contains: q, mode: 'insensitive' } },
            { doctor: { nomComplet: { contains: q, mode: 'insensitive' } } },
            { doctor: { user: { email: { contains: q, mode: 'insensitive' } } } },
            { patient: { user: { email: { contains: q, mode: 'insensitive' } } } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.rendezVous.count({ where }),
    prisma.rendezVous.findMany({
      where,
      orderBy: [{ dateHeure: 'desc' }],
      skip,
      take: safeLimit,
      include: {
        patient: { include: { user: { select: { email: true } } } },
        doctor: { include: { user: { select: { email: true } } } },
        cabinet: true,
      },
    }),
  ]);

  return {
    items: items.map((rdv) => ({
      id: rdv.id,
      dateTime: rdv.dateHeure,
      status: rdv.statut,
      type: rdv.typeConsultation,
      reason: rdv.motif,
      doctor: {
        id: rdv.doctorId,
        name: rdv.doctor?.nomComplet || toDisplayName(rdv.doctor?.user?.email),
        specialty: rdv.doctor?.specialite,
      },
      patient: {
        id: rdv.patientId,
        name: toDisplayName(rdv.patient?.user?.email),
        email: rdv.patient?.user?.email,
      },
      cabinet: rdv.cabinet ? { name: rdv.cabinet.nom, city: rdv.cabinet.ville } : null,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      hasNextPage: skip + items.length < total,
      hasPrevPage: safePage > 1,
    },
  };
};

module.exports = {
  getAdminAppointments,

  getAdminDashboard,
  getAdminAccountDetails,
  notifyAccount,
  approveDoctorChangeRequest,
  rejectDoctorChangeRequest,
  createAccountByAdmin,
  verifyDoctor,
  verifyReview,
  getAdminUsers,
  getAdminLogs,
  getAdminMetrics,
  getAdminDoctors,
  updateDoctorProfileByAdmin,
  updatePatientProfileByAdmin,
  rejectDoctor,
  getAdminReviews,
  rejectReview,
  getAdminNotifications,
  markNotificationsRead,
  disableUser,
  deleteUser,
};

const prisma = require('../config/prisma');
const HttpError = require('../utils/httpError');

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

const canAccessUserProfile = async ({ requester, targetUserId }) => {
  if (!requester?.id) return false;
  return requester.role === 'ADMIN';
};

const getUserProfile = async ({ requester, userId }) => {
  const allowed = await canAccessUserProfile({ requester, targetUserId: userId });
  if (!allowed) {
    throw new HttpError(403, 'Access denied');
  }

  const account = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patient: true,
      doctor: true,
    },
  });

  if (!account) {
    throw new HttpError(404, 'User not found');
  }

  const base = {
    id: account.id,
    email: account.email,
    phone: account.phone,
    role: account.role,
    isVerified: account.isVerified,
    createdAt: account.createdAt,
    lastLoginAt: account.lastLoginAt,
    displayName: account.doctor?.nomComplet || toDisplayName(account.email),
  };

  const patientProfile = account.patient
    ? {
        cin: requester.role === 'ADMIN' || requester.id === account.id ? account.patient.cin : null,
        ville: account.patient.ville,
        sexe: account.patient.sexe,
        dateOfNaissance: account.patient.dateOfNaissance,
        groupeSanguin: account.patient.groupeSanguin,
        antecedents: account.patient.antecedents,
        bookingWarnings: account.patient.bookingWarnings,
        lastNoShowAt: account.patient.lastNoShowAt,
      }
    : null;

  let profilePhoto = null;
  if (account.doctor) {
    profilePhoto =
      (await prisma.doctorDocument.findFirst({
        where: { doctorId: account.doctor.id, isProfilePhoto: true },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      }))
      || (await prisma.doctorDocument.findFirst({
        where: { doctorId: account.doctor.id, mimeType: { startsWith: 'image/' } },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      }));
  }

  const doctorProfile = account.doctor
    ? {
        id: account.doctor.id,
        nomComplet: account.doctor.nomComplet,
        specialite: account.doctor.specialite,
        inpe: requester.role === 'ADMIN' || requester.id === account.id ? account.doctor.inpe : null,
        experience: account.doctor.experience,
        languesParlees: account.doctor.languesParlees || [],
        accepteAssurance: account.doctor.accepteAssurance,
        assurancesAcceptees: account.doctor.assurancesAcceptees || [],
        tarifConsultation: account.doctor.tarifConsultation,
        diplomes: account.doctor.diplomes || [],
        bio: account.doctor.bio,
        profilePhotoUrl: profilePhoto
          ? `/api/doctors/${account.doctor.id}/profile-photo?v=${profilePhoto.id}`
          : null,
      }
    : null;

  let consultedDoctors = [];
  let consultedPatients = [];

  if (account.patient) {
    const patientAppointments = await prisma.rendezVous.findMany({
      where: {
        patientId: account.patient.id,
        statut: { in: ['CONFIRME', 'COMPLETE'] },
      },
      include: {
        doctor: {
          select: {
            userId: true,
            nomComplet: true,
            specialite: true,
            user: { select: { email: true } },
          },
        },
        cabinet: { select: { ville: true } },
      },
      orderBy: [{ dateHeure: 'desc' }],
      take: 30,
    });

    consultedDoctors = patientAppointments.map((item) => ({
      appointmentId: item.id,
      doctorUserId: item.doctor?.userId || null,
      doctorName: item.doctor?.nomComplet || toDisplayName(item.doctor?.user?.email),
      specialty: item.doctor?.specialite || null,
      city: item.cabinet?.ville || 'Maroc',
      status: item.statut,
      dateTime: item.dateHeure,
      reason: item.motif,
    }));
  }

  if (account.doctor) {
    const doctorAppointments = await prisma.rendezVous.findMany({
      where: {
        doctorId: account.doctor.id,
        statut: { in: ['CONFIRME', 'COMPLETE'] },
      },
      include: {
        patient: {
          select: {
            userId: true,
            user: { select: { email: true } },
          },
        },
        cabinet: { select: { ville: true } },
      },
      orderBy: [{ dateHeure: 'desc' }],
      take: 30,
    });

    consultedPatients = doctorAppointments.map((item) => ({
      appointmentId: item.id,
      patientUserId: item.patient?.userId || null,
      patientName: toDisplayName(item.patient?.user?.email),
      city: item.cabinet?.ville || 'Maroc',
      status: item.statut,
      dateTime: item.dateHeure,
      reason: item.motif,
    }));
  }

  return {
    account: base,
    patient: patientProfile,
    doctor: doctorProfile,
    consultedDoctors,
    consultedPatients,
  };
};

module.exports = {
  getUserProfile,
};


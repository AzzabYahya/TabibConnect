const prisma = require('../config/prisma');
const HttpError = require('../utils/httpError');

const activeStatuses = new Set(['EN_ATTENTE', 'CONFIRME']);
const todayFormatter = new Intl.DateTimeFormat('fr-MA', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

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
    : 'Medecin';
};

const getDoctorDashboard = async ({ userId }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          isVerified: true,
          createdAt: true,
        },
      },
      doctorCabinets: {
        include: {
          cabinet: true,
        },
      },
      disponibilites: {
        include: {
          cabinet: true,
        },
        orderBy: [{ cabinetId: 'asc' }, { jourSemaine: 'asc' }, { heureDebut: 'asc' }],
      },
      rendezVous: {
        include: {
          patient: {
            select: {
              dateOfNaissance: true,
              antecedents: true,
              bookingWarnings: true,
              lastNoShowAt: true,
              user: {
                select: {
                  email: true,
                  phone: true,
                },
              },
            },
          },
          cabinet: true,
          disponibilite: true,
          avis: true,
        },
        orderBy: [{ dateHeure: 'asc' }],
      },
      avisRecus: {
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
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 8,
      },
    },
  });

  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found for this account');
  }

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const paidRevenue = await prisma.paiement.aggregate({
    where: {
      doctorId: doctor.id,
      statut: 'PAYE',
      createdAt: {
        gte: monthStart,
      },
    },
    _sum: {
      montant: true,
    },
  });

  const upcomingAppointments = doctor.rendezVous.filter((appointment) =>
    activeStatuses.has(appointment.statut) && new Date(appointment.dateHeure).getTime() >= now.getTime()
  );

  const todayAppointments = doctor.rendezVous.filter((appointment) => {
    const dateISO = new Date(appointment.dateHeure).toISOString().slice(0, 10);
    return dateISO === todayISO && activeStatuses.has(appointment.statut);
  });

  const pendingRequests = upcomingAppointments.filter((appointment) => appointment.statut === 'EN_ATTENTE');
  const completedAppointments = doctor.rendezVous.filter((appointment) => appointment.statut === 'COMPLETE');

  const ratingTotal = doctor.avisRecus.reduce((sum, review) => sum + review.note, 0);
  const ratingAverage = doctor.avisRecus.length ? Number((ratingTotal / doctor.avisRecus.length).toFixed(1)) : 0;

  const cabinets = doctor.doctorCabinets.map((entry) => {
    const availabilityBlocks = doctor.disponibilites
      .filter((availability) => availability.cabinetId === entry.cabinetId)
      .map((availability) => ({
        id: availability.id,
        day: availability.jourSemaine,
        start: availability.heureDebut,
        end: availability.heureFin,
        duration: availability.dureeConsultation,
        active: availability.isActive,
      }));

    return {
      id: entry.cabinet.id,
      name: entry.cabinet.nom,
      city: entry.cabinet.ville,
      quartier: entry.cabinet.quartier,
      address: entry.cabinet.adresse,
      phone: entry.cabinet.phone,
      availabilityCount: availabilityBlocks.length,
      availabilityBlocks,
      teleconsultation: availabilityBlocks.some((block) => block.day === 'MERCREDI' || block.day === 'JEUDI'),
    };
  });

  const mapAppointmentCard = (appointment) => ({
    id: appointment.id,
    patientName: toDisplayName(appointment.patient?.user?.email),
    patientEmail: appointment.patient?.user?.email || null,
    patientWarnings: appointment.patient?.bookingWarnings || 0,
    patientLastNoShowAt: appointment.patient?.lastNoShowAt ? appointment.patient.lastNoShowAt.toISOString() : null,
    age: appointment.patient?.dateOfNaissance
      ? Math.max(0, Math.floor((now.getTime() - new Date(appointment.patient.dateOfNaissance).getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
      : null,
    reason: appointment.motif,
    room: appointment.cabinet?.nom || 'Cabinet non renseigne',
    city: appointment.cabinet?.ville || 'Maroc',
    allergies: appointment.patient?.antecedents || 'Aucun antecedent renseigne',
    fileName: `dossier-${appointment.id}.pdf`,
    appointmentTime: todayFormatter.format(new Date(appointment.dateHeure)),
    status: appointment.statut,
    type: appointment.typeConsultation,
    patientId: appointment.patient?.id || null,
    patientPhone: appointment.patient?.user?.phone || null,
    patientEmail: appointment.patient?.user?.email || null,
    dateTime: appointment.dateHeure.toISOString(),
  });

  const patientDirectory = Object.values(
    doctor.rendezVous.reduce((accumulator, appointment) => {
      const patientId = appointment.patient?.id;
      if (!patientId) {
        return accumulator;
      }
      const existing = accumulator[patientId] || {
        id: patientId,
        name: toDisplayName(appointment.patient.user?.email),
        email: appointment.patient.user?.email || null,
        phone: appointment.patient.user?.phone || null,
        city: appointment.cabinet?.ville || 'Maroc',
        warnings: appointment.patient.bookingWarnings || 0,
        antecedents: appointment.patient.antecedents || 'Aucun antecedent renseigne',
        appointmentsCount: 0,
        lastVisit: null,
      };
      existing.appointmentsCount += 1;
      const visitDate = new Date(appointment.dateHeure);
      if (!existing.lastVisit || visitDate > existing.lastVisit) {
        existing.lastVisit = visitDate;
      }
      accumulator[patientId] = existing;
      return accumulator;
    }, {})
  )
    .sort((left, right) => right.appointmentsCount - left.appointmentsCount)
    .map((patient) => ({
      ...patient,
      lastVisit: patient.lastVisit ? patient.lastVisit.toISOString() : null,
    }));

  return {
    doctor: {
      id: doctor.id,
      name: doctor.nomComplet || toDisplayName(doctor.user.email),
      specialty: doctor.specialite,
      rating: ratingAverage,
      reviews: doctor.avisRecus.length,
      languages: doctor.languesParlees,
      consultationFee: Number(doctor.tarifConsultation),
      bio: doctor.bio || '',
      experience: doctor.experience,
      isVerified: doctor.user.isVerified,
      phone: doctor.user.phone,
      email: doctor.user.email,
      cityFocus: [...new Set(cabinets.map((cabinet) => cabinet.city))],
    },
    summary: {
      todayAppointments: todayAppointments.length,
      pendingRequests: pendingRequests.length,
      upcomingAppointments: upcomingAppointments.length,
      activeAvailabilities: doctor.disponibilites.filter((availability) => availability.isActive).length,
      monthlyRevenue: Number(paidRevenue._sum.montant || 0),
      completedAppointments: completedAppointments.length,
    },
    cabinets,
    todayPatients: todayAppointments.map(mapAppointmentCard),
    pendingRequests: pendingRequests.map(mapAppointmentCard),
    upcomingAppointments: upcomingAppointments.map(mapAppointmentCard),
    patientDirectory,
    recentReviews: doctor.avisRecus.map((review) => ({
      id: review.id,
      patientName: toDisplayName(review.patient?.user?.email),
      rating: review.note,
      comment: review.commentaire || '',
      verified: review.isVerified,
      date: review.createdAt,
      appointmentId: review.rendezVousId,
    })),
    publicProfile: {
      nomComplet: doctor.nomComplet || toDisplayName(doctor.user.email),
      specialite: doctor.specialite,
      diplomes: doctor.diplomes,
      languesParlees: doctor.languesParlees,
      tarifConsultation: Number(doctor.tarifConsultation),
      accepteAssurance: doctor.accepteAssurance,
      assurancesAcceptees: doctor.assurancesAcceptees,
      bio: doctor.bio || '',
      experience: doctor.experience,
      phone: doctor.user.phone,
    },
  };
};

module.exports = {
  getDoctorDashboard,
};

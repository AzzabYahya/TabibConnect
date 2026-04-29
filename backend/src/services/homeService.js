const prisma = require('../config/prisma');

const toDisplayName = (email) => {
  const localPart = String(email || '')
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .trim();

  if (!localPart) {
    return 'Patient anonyme';
  }

  return localPart
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const timeFormatter = new Intl.DateTimeFormat('fr-MA', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const getHomeSummary = async () => {
  const [verifiedDoctors, patients, appointments, reviews, allDoctors, allCabinets] = await Promise.all([
    prisma.user.count({ where: { role: 'DOCTOR', isVerified: true } }),
    prisma.patient.count(),
    prisma.rendezVous.count(),
    prisma.avis.count(),
    prisma.doctor.findMany({
      include: {
        doctorCabinets: {
          include: {
            cabinet: {
              select: {
                id: true,
                ville: true,
                quartier: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
      },
    }),
    prisma.cabinet.findMany({
      select: {
        id: true,
        ville: true,
        quartier: true,
        latitude: true,
        longitude: true,
      },
    }),
  ]);

  const specialtyCounts = new Map();
  const hotspotGroups = new Map();

  for (const doctor of allDoctors) {
    specialtyCounts.set(doctor.specialite, (specialtyCounts.get(doctor.specialite) || 0) + 1);

    for (const entry of doctor.doctorCabinets || []) {
      const city = entry.cabinet?.ville;

      if (!city) {
        continue;
      }

      const current = hotspotGroups.get(city) || {
        ville: city,
        center: null,
        doctors: new Set(),
        cabinets: new Set(),
        specialties: new Map(),
      };

      current.doctors.add(doctor.id);
      current.cabinets.add(entry.cabinet.id);
      current.specialties.set(
        doctor.specialite,
        (current.specialties.get(doctor.specialite) || 0) + 1
      );

      if (!current.center) {
        current.center = [Number(entry.cabinet.latitude), Number(entry.cabinet.longitude)];
      }

      hotspotGroups.set(city, current);
    }
  }

  const specialties = Array.from(specialtyCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([label, count], index) => ({
      label,
      count,
      color: ['rose', 'indigo', 'amber', 'cyan', 'emerald', 'blue'][index] || 'slate',
    }));

  const hotspots = Array.from(hotspotGroups.values())
    .map((item) => {
      const topSpecialties = Array.from(item.specialties.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, 2)
        .map(([specialty]) => specialty)
        .join(' / ');

      return {
        ville: item.ville,
        center: item.center || [0, 0],
        label: topSpecialties || 'Medecine generale',
        doctorsCount: item.doctors.size,
        cabinetsCount: item.cabinets.size,
      };
    })
    .sort((left, right) => right.doctorsCount - left.doctorsCount)
    .slice(0, 5);

  const citiesCount = new Set(allCabinets.map((cabinet) => cabinet.ville).filter(Boolean)).size;

  const approvedReviews = await prisma.avis.findMany({
    where: { isVerified: true },
    orderBy: [{ createdAt: 'desc' }],
    take: 3,
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
        select: {
          nomComplet: true,
          specialite: true,
        },
      },
    },
  });

  const fallbackReviews = approvedReviews.length
    ? approvedReviews
    : await prisma.avis.findMany({
        orderBy: [{ createdAt: 'desc' }],
        take: 3,
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
            select: {
              nomComplet: true,
              specialite: true,
            },
          },
        },
      });

  const testimonials = fallbackReviews.map((review) => ({
    name: toDisplayName(review.patient?.user?.email),
    city: review.patient?.ville || 'Maroc',
    quote: review.commentaire || `Avis ${review.note}/5 pour ${review.doctor?.specialite || 'ce spécialiste'}.`,
    doctorName: review.doctor?.nomComplet || 'Medecin',
    specialty: review.doctor?.specialite || 'Specialite',
    rating: review.note,
    date: timeFormatter.format(review.createdAt),
    dateIso: review.createdAt.toISOString(),
  }));

  const topCities = Array.from(
    allCabinets.reduce((accumulator, cabinet) => {
      const current = accumulator.get(cabinet.ville) || {
        ville: cabinet.ville,
        center: [Number(cabinet.latitude), Number(cabinet.longitude)],
        cabinets: 0,
      };

      current.cabinets += 1;
      accumulator.set(cabinet.ville, current);
      return accumulator;
    }, new Map()).values()
  ).sort((left, right) => right.cabinets - left.cabinets);

  return {
    overview: {
      verifiedDoctorsCount: verifiedDoctors,
      citiesCount,
    },
    stats: [
      { label: 'Medecins verifies', value: verifiedDoctors, suffix: '+' },
      { label: 'Patients inscrits', value: patients, suffix: '+' },
      { label: 'RDV enregistrés', value: appointments, suffix: '+' },
      { label: 'Avis publiés', value: reviews, suffix: '+' },
    ],
    specialties,
    hotspots: hotspots.length ? hotspots : topCities.slice(0, 5).map((item) => ({
      ville: item.ville,
      center: item.center,
      label: 'Cabinets medicaux actifs',
      doctorsCount: 0,
      cabinetsCount: item.cabinets,
    })),
    testimonials,
  };
};

module.exports = {
  getHomeSummary,
};

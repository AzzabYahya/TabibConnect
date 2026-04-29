const { Prisma } = require('@prisma/client');

const prisma = require('../config/prisma');
const HttpError = require('../utils/httpError');
const { suggestSpecialties } = require('../utils/specialtySuggestion');
const {
  computeDoctorAvailabilitiesByDate,
  doctorHasAvailabilityOnDate,
} = require('./availabilityService');

const toBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }

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

const getDoctorRatingSummary = async (doctorIds = []) => {
  if (!doctorIds.length) {
    return new Map();
  }

  const grouped = await prisma.avis.groupBy({
    by: ['doctorId'],
    where: {
      doctorId: {
        in: doctorIds,
      },
    },
    _avg: {
      note: true,
    },
    _count: {
      _all: true,
    },
  });

  return new Map(
    grouped.map((row) => [
      row.doctorId,
      {
        average: row._avg.note ? Number(row._avg.note) : 0,
        count: row._count._all,
      },
    ])
  );
};

const enrichDoctor = (doctor, ratingSummary) => {
  const summary = ratingSummary.get(doctor.id) || { average: 0, count: 0 };

  return {
    ...doctor,
    tarifConsultation: Number(doctor.tarifConsultation),
    rating: summary,
  };
};

const listDoctors = async (filters) => {
  const where = {};

  if (filters.q) {
    where.OR = [
      {
        nomComplet: {
          contains: filters.q,
          mode: 'insensitive',
        },
      },
      {
        specialite: {
          contains: filters.q,
          mode: 'insensitive',
        },
      },
      {
        user: {
          email: {
            contains: filters.q,
            mode: 'insensitive',
          },
        },
      },
    ];
  }

  if (filters.specialite) {
    where.specialite = {
      contains: filters.specialite,
      mode: 'insensitive',
    };
  }

  if (filters.accepteAssurance !== undefined) {
    where.accepteAssurance = toBoolean(filters.accepteAssurance);
  }

  if (filters.maxTarif !== undefined) {
    where.tarifConsultation = {
      lte: new Prisma.Decimal(filters.maxTarif),
    };
  }

  if (filters.langue) {
    where.languesParlees = {
      has: filters.langue,
    };
  }

  if (filters.ville) {
    where.doctorCabinets = {
      some: {
        cabinet: {
          ville: {
            contains: filters.ville,
            mode: 'insensitive',
          },
        },
      },
    };
  }

  const doctors = await prisma.doctor.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          isVerified: true,
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
              latitude: true,
              longitude: true,
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  const ratingSummary = await getDoctorRatingSummary(doctors.map((doctor) => doctor.id));
  let results = doctors.map((doctor) => enrichDoctor(doctor, ratingSummary));

  if (filters.minNote !== undefined) {
    const minNote = Number(filters.minNote);
    results = results.filter((doctor) => doctor.rating.average >= minNote);
  }

  if (toBoolean(filters.availableToday)) {
    const todayISO = new Date().toISOString().slice(0, 10);
    const availabilityChecks = await Promise.all(
      results.map(async (doctor) => {
        const available = await doctorHasAvailabilityOnDate({
          doctorId: doctor.id,
          dateISO: todayISO,
        });

        return { doctor, available };
      })
    );

    results = availabilityChecks
      .filter((entry) => entry.available)
      .map((entry) => entry.doctor);
  }

  return results;
};

const getDoctorProfile = async (doctorId) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
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
      documents: {
        select: {
          id: true,
          fileName: true,
          filePath: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      },
      doctorCabinets: {
        include: {
          cabinet: true,
        },
      },
      disponibilites: {
        select: {
          jourSemaine: true,
          isActive: true,
        },
      },
    },
  });

  if (!doctor) {
    throw new HttpError(404, 'Doctor not found');
  }

  const ratingSummary = await getDoctorRatingSummary([doctor.id]);
  const enrichedDoctor = enrichDoctor(doctor, ratingSummary);
  const availabilityDays = Array.from(
    new Set((enrichedDoctor.disponibilites || []).filter((disponibilite) => disponibilite.isActive).map((disponibilite) => disponibilite.jourSemaine))
  );
  const { disponibilites, ...doctorWithoutSchedule } = enrichedDoctor;

  return {
    ...doctorWithoutSchedule,
    availabilityDays,
  };
};

const searchDoctors = async (query) => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return {
      query: normalizedQuery,
      suggestedSpecialties: [],
      results: [],
    };
  }

  const suggestedSpecialties = suggestSpecialties(normalizedQuery);

  const fullTextResults = await prisma.$queryRaw`
    SELECT
      d.id,
      d."nomComplet",
      d.specialite,
      d.bio,
      d."tarifConsultation",
      d.experience,
      d."accepteAssurance",
      d."languesParlees",
      u.email,
      ts_rank(
        to_tsvector(
          'simple',
          concat_ws(
            ' ',
            coalesce(d."nomComplet", ''),
            coalesce(d.specialite, ''),
            coalesce(d.bio, ''),
            coalesce(u.email, '')
          )
        ),
        plainto_tsquery('simple', ${normalizedQuery})
      ) AS rank
    FROM "Doctor" d
    INNER JOIN "User" u ON u.id = d."userId"
    WHERE to_tsvector(
      'simple',
      concat_ws(
        ' ',
        coalesce(d."nomComplet", ''),
        coalesce(d.specialite, ''),
        coalesce(d.bio, ''),
        coalesce(u.email, '')
      )
    ) @@ plainto_tsquery('simple', ${normalizedQuery})
    ORDER BY rank DESC
    LIMIT 25
  `;

  const mappedFullText = fullTextResults.map((row) => ({
    id: row.id,
    nomComplet: row.nomComplet,
    specialite: row.specialite,
    bio: row.bio,
    tarifConsultation: Number(row.tarifConsultation),
    experience: row.experience,
    accepteAssurance: row.accepteAssurance,
    languesParlees: row.languesParlees,
    email: row.email,
    rank: Number(row.rank),
  }));

  let specialtyFallback = [];

  if (suggestedSpecialties.length) {
    specialtyFallback = await prisma.doctor.findMany({
      where: {
        OR: suggestedSpecialties.map((speciality) => ({
          specialite: {
            contains: speciality,
            mode: 'insensitive',
          },
        })),
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      take: 25,
    });
  }

  const fallbackMapped = specialtyFallback.map((doctor) => ({
    id: doctor.id,
    nomComplet: doctor.nomComplet,
    specialite: doctor.specialite,
    bio: doctor.bio,
    tarifConsultation: Number(doctor.tarifConsultation),
    experience: doctor.experience,
    accepteAssurance: doctor.accepteAssurance,
    languesParlees: doctor.languesParlees,
    email: doctor.user.email,
    rank: 0,
    suggestionMatch: true,
  }));

  const merged = new Map();

  [...mappedFullText, ...fallbackMapped].forEach((doctor) => {
    if (!merged.has(doctor.id)) {
      merged.set(doctor.id, doctor);
    }
  });

  return {
    query: normalizedQuery,
    suggestedSpecialties,
    results: Array.from(merged.values()),
  };
};

const updateDoctorProfile = async ({ userId, payload }) => {
  const doctor = await prisma.doctor.findUnique({
    where: {
      userId,
    },
  });

  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found for this account');
  }

  const data = {
    nomComplet: payload.nomComplet ?? doctor.nomComplet,
    specialite: payload.specialite ?? doctor.specialite,
    diplomes: payload.diplomes
      ? toStringList(payload.diplomes)
      : doctor.diplomes,
    languesParlees: payload.languesParlees
      ? toStringList(payload.languesParlees)
      : doctor.languesParlees,
    tarifConsultation:
      payload.tarifConsultation !== undefined
        ? new Prisma.Decimal(payload.tarifConsultation)
        : doctor.tarifConsultation,
    accepteAssurance:
      payload.accepteAssurance !== undefined
        ? toBoolean(payload.accepteAssurance)
        : doctor.accepteAssurance,
    assurancesAcceptees: payload.assurancesAcceptees
      ? toStringList(payload.assurancesAcceptees)
      : doctor.assurancesAcceptees,
    bio: payload.bio ?? doctor.bio,
    experience:
      payload.experience !== undefined
        ? Number(payload.experience)
        : doctor.experience,
  };

  const updated = await prisma.doctor.update({
    where: { id: doctor.id },
    data,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          isVerified: true,
        },
      },
    },
  });

  return {
    ...updated,
    tarifConsultation: Number(updated.tarifConsultation),
  };
};

const getDoctorAvailabilitiesForDate = async ({ doctorId, dateISO }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { id: true },
  });

  if (!doctor) {
    throw new HttpError(404, 'Doctor not found');
  }

  return computeDoctorAvailabilitiesByDate({ doctorId, dateISO });
};

const getDoctorReviews = async ({ doctorId, page = 1, limit = 10 }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { id: true },
  });

  if (!doctor) {
    throw new HttpError(404, 'Doctor not found');
  }

  const currentPage = Math.max(1, Number(page));
  const pageSize = Math.min(50, Math.max(1, Number(limit)));

  const [reviews, total, aggregate] = await Promise.all([
    prisma.avis.findMany({
      where: { doctorId },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
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
    }),
    prisma.avis.count({ where: { doctorId } }),
    prisma.avis.aggregate({
      where: { doctorId },
      _avg: { note: true },
    }),
  ]);

  return {
    page: currentPage,
    limit: pageSize,
    total,
    averageNote: aggregate._avg.note ? Number(aggregate._avg.note) : 0,
    reviews,
  };
};

const getDoctorProfileManagement = async ({ userId }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    include: {
      doctorCabinets: {
        include: {
          cabinet: true,
        },
      },
      disponibilites: {
        orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }],
      },
    },
  });

  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found for this account');
  }

  return {
    profile: {
      id: doctor.id,
      nomComplet: doctor.nomComplet,
      specialite: doctor.specialite,
      diplomes: doctor.diplomes || [],
      languesParlees: doctor.languesParlees || [],
      tarifConsultation: Number(doctor.tarifConsultation),
      accepteAssurance: doctor.accepteAssurance,
      assurancesAcceptees: doctor.assurancesAcceptees || [],
      bio: doctor.bio || '',
      experience: doctor.experience,
    },
    cabinets: doctor.doctorCabinets.map((entry) => ({
      id: entry.cabinet.id,
      name: entry.cabinet.nom,
      city: entry.cabinet.ville,
      district: entry.cabinet.quartier,
    })),
    availabilities: doctor.disponibilites,
  };
};

const createDoctorAvailability = async ({ userId, payload }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found');
  }

  const ownsCabinet = await prisma.doctorCabinet.findFirst({
    where: {
      doctorId: doctor.id,
      cabinetId: payload.cabinetId,
    },
    select: { id: true },
  });
  if (!ownsCabinet) {
    throw new HttpError(403, 'Cabinet does not belong to this doctor');
  }

  return prisma.disponibilite.create({
    data: {
      doctorId: doctor.id,
      cabinetId: payload.cabinetId,
      jourSemaine: payload.jourSemaine,
      heureDebut: payload.heureDebut,
      heureFin: payload.heureFin,
      dureeConsultation: Number(payload.dureeConsultation),
      isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
    },
  });
};

const updateDoctorAvailability = async ({ userId, availabilityId, payload }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found');
  }

  const availability = await prisma.disponibilite.findUnique({
    where: { id: availabilityId },
  });
  if (!availability || availability.doctorId !== doctor.id) {
    throw new HttpError(404, 'Availability not found');
  }

  return prisma.disponibilite.update({
    where: { id: availabilityId },
    data: {
      jourSemaine: payload.jourSemaine ?? availability.jourSemaine,
      heureDebut: payload.heureDebut ?? availability.heureDebut,
      heureFin: payload.heureFin ?? availability.heureFin,
      dureeConsultation: payload.dureeConsultation !== undefined
        ? Number(payload.dureeConsultation)
        : availability.dureeConsultation,
      isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : availability.isActive,
    },
  });
};

const deleteDoctorAvailability = async ({ userId, availabilityId }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found');
  }

  const availability = await prisma.disponibilite.findUnique({
    where: { id: availabilityId },
  });
  if (!availability || availability.doctorId !== doctor.id) {
    throw new HttpError(404, 'Availability not found');
  }

  await prisma.disponibilite.delete({
    where: { id: availabilityId },
  });
};

const submitDoctorChangeRequest = async ({ userId, payload }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found');
  }

  const type = String(payload.type || '').toUpperCase();
  if (!['PROFILE_UPDATE', 'LOCATION_CREATE', 'LOCATION_UPDATE'].includes(type)) {
    throw new HttpError(400, 'Invalid change request type');
  }

  if (!String(payload.reason || '').trim()) {
    throw new HttpError(400, 'Reason is required');
  }

  const request = await prisma.doctorChangeRequest.create({
    data: {
      doctorId: doctor.id,
      type,
      reason: String(payload.reason).trim(),
      payload: payload.data || {},
    },
  });

  return request;
};

const listDoctorChangeRequests = async ({ userId }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found');
  }

  return prisma.doctorChangeRequest.findMany({
    where: { doctorId: doctor.id },
    orderBy: [{ createdAt: 'desc' }],
    take: 50,
  });
};

const updateDoctorChangeRequest = async ({ userId, requestId, payload }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found');
  }

  const request = await prisma.doctorChangeRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.doctorId !== doctor.id) {
    throw new HttpError(404, 'Change request not found');
  }
  if (request.status !== 'PENDING') {
    throw new HttpError(400, 'Only pending requests can be modified');
  }

  const type = String(payload.type || '').toUpperCase();
  if (!['PROFILE_UPDATE', 'LOCATION_CREATE', 'LOCATION_UPDATE'].includes(type)) {
    throw new HttpError(400, 'Invalid change request type');
  }
  if (!String(payload.reason || '').trim()) {
    throw new HttpError(400, 'Reason is required');
  }

  return prisma.doctorChangeRequest.update({
    where: { id: requestId },
    data: {
      type,
      reason: String(payload.reason).trim(),
      payload: payload.data || {},
    },
  });
};

const cancelDoctorChangeRequest = async ({ userId, requestId }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found');
  }

  const request = await prisma.doctorChangeRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.doctorId !== doctor.id) {
    throw new HttpError(404, 'Change request not found');
  }
  if (request.status !== 'PENDING') {
    throw new HttpError(400, 'Only pending requests can be cancelled');
  }

  await prisma.doctorChangeRequest.delete({
    where: { id: requestId },
  });
};

module.exports = {
  getDoctorAvailabilitiesForDate,
  getDoctorProfile,
  getDoctorReviews,
  listDoctors,
  searchDoctors,
  getDoctorProfileManagement,
  createDoctorAvailability,
  updateDoctorAvailability,
  deleteDoctorAvailability,
  submitDoctorChangeRequest,
  listDoctorChangeRequests,
  updateDoctorChangeRequest,
  cancelDoctorChangeRequest,
  updateDoctorProfile,
};

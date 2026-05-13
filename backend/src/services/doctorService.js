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
  const andClauses = [
    {
      user: {
        isVerified: true,
      },
    },
  ];

  if (filters.q) {
    const parts = filters.q.trim().split(/\s+/).filter(Boolean);
    parts.forEach((part) => {
      andClauses.push({
        OR: [
          { nomComplet: { contains: part, mode: 'insensitive' } },
          { specialite: { contains: part, mode: 'insensitive' } },
          { user: { email: { contains: part, mode: 'insensitive' } } },
        ],
      });
    });
  }


  if (filters.specialite) {
    andClauses.push({
      specialite: {
        contains: filters.specialite,
        mode: 'insensitive',
      },
    });
  }

  if (toBoolean(filters.accepteAssurance)) {
    andClauses.push({
      accepteAssurance: true,
    });
  }


  if (filters.maxTarif !== undefined && Number(filters.maxTarif) < 2000) {
    andClauses.push({
      tarifConsultation: {
        lte: new Prisma.Decimal(filters.maxTarif),
      },
    });
  }

  if (filters.langue) {
    andClauses.push({
      languesParlees: {
        has: filters.langue,
      },
    });
  }

  if (filters.ville) {
    andClauses.push({
      doctorCabinets: {
        some: {
          cabinet: {
            ville: {
              contains: filters.ville,
              mode: 'insensitive',
            },
          },
        },
      },
    });
  }

  if (toBoolean(filters.videoOnly)) {
    andClauses.push({
      OR: [
        { bio: { contains: 'tele', mode: 'insensitive' } },
        { experience: { gte: 8 } },
      ],
    });
  }

  const where = { AND: andClauses };

  // Fetch all potential matches to apply post-fetch filters (sexe, minNote) 
  // while maintaining correct pagination.
  const allDoctors = await prisma.doctor.findMany({
    where,
    select: {
      id: true,
      nomComplet: true,
      specialite: true,
      experience: true,
      tarifConsultation: true,
      accepteAssurance: true,
      bio: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  const allDoctorIds = allDoctors.map((d) => d.id);
  const ratingSummary = await getDoctorRatingSummary(allDoctorIds);

  // Helper for gender inference (matching frontend logic)
  const inferGender = (doc) => {
    const text = `${doc.nomComplet || ''} ${doc.user?.email || ''}`.toLowerCase();
    if (/(salma|khadija|fatima|meryem|nadia|laila|sanae|mina|hajar)/.test(text)) return 'FEMME';
    if (/(amine|youssef|omar|hamza|karim|hicham|mehdi|younes|mohamed|abdel)/.test(text)) return 'HOMME';
    return 'TOUT';
  };

  // Apply in-memory filters
  let filteredResults = allDoctors.map(doc => {
    const rating = ratingSummary.get(doc.id) || { average: 0, count: 0 };
    return { ...doc, rating, inferredSexe: inferGender(doc) };
  });

  if (filters.sexe && filters.sexe !== 'TOUT') {
    filteredResults = filteredResults.filter(d => d.inferredSexe === filters.sexe);
  }

  if (filters.minNote && Number(filters.minNote) > 0) {
    filteredResults = filteredResults.filter(d => d.rating.average >= Number(filters.minNote));
  }

  const total = filteredResults.length;
  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.max(1, Number(filters.limit || 8));
  const skip = (page - 1) * limit;

  const pagedResults = filteredResults.slice(skip, skip + limit);
  const pagedIds = pagedResults.map(d => d.id);

  // Fetch full data for the paged results
  const doctors = await prisma.doctor.findMany({
    where: { id: { in: pagedIds } },
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
          cabinet: true,
        },
      },
    },
  });

  // Re-sort doctors to match pagedIds order
  const doctorsMap = new Map(doctors.map(d => [d.id, d]));
  const sortedDoctors = pagedIds.map(id => doctorsMap.get(id)).filter(Boolean);

  // Enrich with photos and final ratings
  const profilePhotos = await prisma.doctorDocument.findMany({
    where: {
      doctorId: { in: pagedIds },
      mimeType: { startsWith: 'image/' },
    },
    select: {
      id: true,
      doctorId: true,
      isProfilePhoto: true,
      createdAt: true,
    },
    orderBy: [{ doctorId: 'asc' }, { isProfilePhoto: 'desc' }, { createdAt: 'desc' }],
  });

  const profilePhotoByDoctorId = new Map();
  for (const doc of profilePhotos) {
    if (!profilePhotoByDoctorId.has(doc.doctorId)) {
      profilePhotoByDoctorId.set(doc.doctorId, doc);
    }
  }

  const finalResults = sortedDoctors.map((doctor) => {
    const enriched = enrichDoctor(doctor, ratingSummary);
    const profilePhoto = profilePhotoByDoctorId.get(doctor.id);

    return {
      ...enriched,
      profilePhotoUrl: profilePhoto ? `/doctors/${doctor.id}/profile-photo?v=${profilePhoto.id}` : null,
    };
  });

  if (toBoolean(filters.availableToday)) {
    const todayISO = new Date().toISOString().slice(0, 10);
    const availabilityChecks = await Promise.all(
      finalResults.map(async (doctor) => {
        const available = await doctorHasAvailabilityOnDate({
          doctorId: doctor.id,
          dateISO: todayISO,
        });

        return { doctor, available };
      })
    );

    return {
      items: availabilityChecks
        .filter((entry) => entry.available)
        .map((entry) => entry.doctor),
      pagination: {
        page,
        limit,
        total: availabilityChecks.filter((e) => e.available).length,
        pages: Math.ceil(total / limit),
      },
    };
  }

  return {
    items: finalResults,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
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
          isProfilePhoto: true,
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
  if (!doctor.user?.isVerified) {
    throw new HttpError(404, 'Doctor not found');
  }

  const ratingSummary = await getDoctorRatingSummary([doctor.id]);
  const enrichedDoctor = enrichDoctor(doctor, ratingSummary);
  const availabilityDays = Array.from(
    new Set((enrichedDoctor.disponibilites || []).filter((disponibilite) => disponibilite.isActive).map((disponibilite) => disponibilite.jourSemaine))
  );
  const { disponibilites, ...doctorWithoutSchedule } = enrichedDoctor;
  const profilePhoto =
    (doctorWithoutSchedule.documents || []).find((doc) => doc.isProfilePhoto)
    || (doctorWithoutSchedule.documents || []).find((doc) => String(doc.mimeType || '').startsWith('image/'))
    || null;

  return {
    ...doctorWithoutSchedule,
    availabilityDays,
    profilePhoto: profilePhoto
      ? {
        id: profilePhoto.id,
        fileName: profilePhoto.fileName,
        filePath: profilePhoto.filePath,
        mimeType: profilePhoto.mimeType,
      }
      : null,
    profilePhotoUrl: profilePhoto
      ? `/doctors/${doctorId}/profile-photo?v=${profilePhoto.id}`
      : null,
  };
};

const searchDoctors = async (queryFilters) => {
  const query = typeof queryFilters === 'string' ? queryFilters : (queryFilters.q || '');
  const normalizedQuery = query.trim();
  const page = Math.max(1, Number(queryFilters.page || 1));
  const limit = Math.max(1, Number(queryFilters.limit || 8));
  const skip = (page - 1) * limit;

  if (!normalizedQuery) {
    return {
      query: normalizedQuery,
      suggestedSpecialties: [],
      items: [],
      pagination: { page, limit, total: 0, pages: 0 },
    };
  }

  const suggestedSpecialties = suggestSpecialties(normalizedQuery);
  const queryPattern = `%${normalizedQuery}%`;
  const specialtiesArray = suggestedSpecialties.length > 0 ? suggestedSpecialties : [''];

  // Unified Search Query
  const results = await prisma.$queryRaw`
    WITH RankedDoctors AS (
      SELECT
        d.id,
        d."nomComplet",
        d.specialite,
        d.bio,
        d."tarifConsultation",
        d.experience,
        d."accepteAssurance",
        d."languesParlees",
        d.diplomes,
        d."assurancesAcceptees",
        u.email,
        (
          ts_rank(
            to_tsvector('simple', concat_ws(' ', coalesce(d."nomComplet", ''), coalesce(d.specialite, ''), coalesce(d.bio, ''), coalesce(u.email, ''))),
            plainto_tsquery('simple', ${normalizedQuery})
          ) * 10 +
          CASE WHEN d."nomComplet" ILIKE ${queryPattern} THEN 5 ELSE 0 END +
          CASE WHEN u.email ILIKE ${queryPattern} THEN 3 ELSE 0 END +
          CASE WHEN d.specialite ANY(ARRAY[${Prisma.join(specialtiesArray)}]) THEN 4 ELSE 0 END
        ) AS rank
      FROM "Doctor" d
      INNER JOIN "User" u ON u.id = d."userId"
      WHERE u."isVerified" = true
      AND (
        to_tsvector('simple', concat_ws(' ', coalesce(d."nomComplet", ''), coalesce(d.specialite, ''), coalesce(d.bio, ''), coalesce(u.email, ''))) @@ plainto_tsquery('simple', ${normalizedQuery})
        OR d."nomComplet" ILIKE ${queryPattern}
        OR u.email ILIKE ${queryPattern}
        OR d.specialite ANY(ARRAY[${Prisma.join(specialtiesArray)}])
      )
    )
    SELECT * FROM RankedDoctors
    ORDER BY rank DESC
    LIMIT ${limit} OFFSET ${skip}
  `;

  // Count Query
  const countResult = await prisma.$queryRaw`
    SELECT COUNT(*)::int as total
    FROM "Doctor" d
    INNER JOIN "User" u ON u.id = d."userId"
    WHERE u."isVerified" = true
    AND (
      to_tsvector('simple', concat_ws(' ', coalesce(d."nomComplet", ''), coalesce(d.specialite, ''), coalesce(d.bio, ''), coalesce(u.email, ''))) @@ plainto_tsquery('simple', ${normalizedQuery})
      OR d."nomComplet" ILIKE ${queryPattern}
      OR u.email ILIKE ${queryPattern}
      OR d.specialite ANY(ARRAY[${Prisma.join(specialtiesArray)}])
    )
  `;

  const total = countResult[0]?.total || 0;
  const doctorIds = results.map((d) => d.id);

  if (!doctorIds.length) {
    return {
      query: normalizedQuery,
      suggestedSpecialties,
      items: [],
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  // Enrich results (Photos, Ratings, Cabinets)
  const [profilePhotos, ratingSummary, doctorCabinetsData] = await Promise.all([
    prisma.doctorDocument.findMany({
      where: { doctorId: { in: doctorIds }, mimeType: { startsWith: 'image/' } },
      select: { id: true, doctorId: true, isProfilePhoto: true, createdAt: true },
      orderBy: [{ doctorId: 'asc' }, { isProfilePhoto: 'desc' }, { createdAt: 'desc' }],
    }),
    getDoctorRatingSummary(doctorIds),
    prisma.doctorCabinet.findMany({
      where: { doctorId: { in: doctorIds } },
      include: {
        cabinet: {
          select: { id: true, nom: true, ville: true, quartier: true, latitude: true, longitude: true },
        },
      },
    }),
  ]);

  const photoMap = new Map();
  profilePhotos.forEach(p => { if (!photoMap.has(p.doctorId)) photoMap.set(p.doctorId, p); });

  const cabinetMap = new Map();
  doctorCabinetsData.forEach(dc => {
    if (!cabinetMap.has(dc.doctorId)) cabinetMap.set(dc.doctorId, []);
    cabinetMap.get(dc.doctorId).push(dc);
  });

  const enrichedItems = results.map((d) => {
    const photo = photoMap.get(d.id);
    const rating = ratingSummary.get(d.id) || { average: 0, count: 0 };
    return {
      ...d,
      tarifConsultation: Number(d.tarifConsultation),
      profilePhotoUrl: photo ? `/doctors/${d.id}/profile-photo?v=${photo.id}` : null,
      ratingAverage: rating.average,
      ratingCount: rating.count,
      doctorCabinets: cabinetMap.get(d.id) || [],
    };
  });


  return {
    query: normalizedQuery,
    suggestedSpecialties,
    items: enrichedItems,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
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

const uploadDoctorProfilePhoto = async ({ userId, file }) => {
  if (!file || !String(file.mimetype || '').startsWith('image/')) {
    throw new HttpError(400, 'A valid profile image is required');
  }

  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true, userId: true },
  });
  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found');
  }

  const createdDocument = await prisma.doctorDocument.create({
    data: {
      doctorId: doctor.id,
      fileName: file.originalname,
      filePath: file.path,
      mimeType: file.mimetype,
      size: file.size,
      isProfilePhoto: false,
    },
  });

  await prisma.$transaction([
    prisma.doctorChangeRequest.create({
      data: {
        doctorId: doctor.id,
        type: 'PROFILE_PHOTO_UPDATE',
        reason: 'Changement photo de profil (validation admin requise)',
        payload: {
          documentId: createdDocument.id,
          fileName: createdDocument.fileName,
          mimeType: createdDocument.mimeType,
          size: createdDocument.size,
          uploadedAt: new Date().toISOString(),
        },
      },
    }),
  ]);

  return {
    uploaded: true,
    requiresAdminValidation: true,
    documentId: createdDocument.id,
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

  const latestProfilePhoto = await prisma.doctorDocument.findFirst({
    where: { doctorId: doctor.id, isProfilePhoto: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  const profilePhotoUrl = latestProfilePhoto ? `/doctors/${doctor.id}/profile-photo` : null;

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
    profilePhotoUrl,
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

const getDoctorAgenda = async ({ userId, weekStartISO }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found');
  }

  const base = weekStartISO ? new Date(weekStartISO) : new Date();
  if (!Number.isFinite(base.getTime())) {
    throw new HttpError(400, 'weekStart must be a valid ISO date');
  }
  // Normalize to Monday 00:00
  const start = new Date(base);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const appointments = await prisma.rendezVous.findMany({
    where: {
      doctorId: doctor.id,
      dateHeure: { gte: start, lt: end },
    },
    orderBy: [{ dateHeure: 'asc' }],
    include: {
      patient: { include: { user: { select: { email: true, phone: true } } } },
      cabinet: true,
    },
  });

  const toFirstName = (email) => {
    const local = String(email || '').split('@')[0].trim();
    const first = local.split(/[._\s-]+/).filter(Boolean)[0] || local;
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : 'Patient';
  };

  return {
    weekStart: start.toISOString().slice(0, 10),
    weekEnd: new Date(end.getTime() - 1).toISOString().slice(0, 10),
    items: appointments.map((rdv) => ({
      id: rdv.id,
      dateTime: rdv.dateHeure.toISOString(),
      status: rdv.statut,
      type: rdv.typeConsultation,
      reason: rdv.motif,
      notes: rdv.notes || null,
      cancellationReason: rdv.cancellationReason || null,
      patient: {
        id: rdv.patientId,
        firstName: toFirstName(rdv.patient?.user?.email),
        email: rdv.patient?.user?.email || null,
        phone: rdv.patient?.user?.phone || null,
      },
      cabinet: rdv.cabinet
        ? {
          id: rdv.cabinet.id,
          name: rdv.cabinet.nom,
          city: rdv.cabinet.ville,
          district: rdv.cabinet.quartier,
          address: rdv.cabinet.adresse,
          latitude: Number(rdv.cabinet.latitude),
          longitude: Number(rdv.cabinet.longitude),
        }
        : null,
    })),
  };
};

const listDoctorPatients = async ({ userId, page = 1, limit = 15, search = '' }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found');
  }

  const currentPage = Math.max(1, Number(page));
  const pageSize = Math.min(50, Math.max(1, Number(limit)));
  const q = String(search || '').trim().toLowerCase();

  const grouped = await prisma.rendezVous.groupBy({
    by: ['patientId'],
    where: { doctorId: doctor.id },
    _count: { _all: true },
    _max: { dateHeure: true },
  });

  const patientIds = grouped.map((g) => g.patientId);
  const patients = await prisma.patient.findMany({
    where: {
      id: { in: patientIds },
    },
    include: {
      user: { select: { email: true, phone: true } },
    },
  });

  const toFirstName = (email) => {
    const local = String(email || '').split('@')[0].trim();
    const first = local.split(/[._\s-]+/).filter(Boolean)[0] || local;
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : 'Patient';
  };

  const merged = patients
    .map((p) => {
      const g = grouped.find((x) => x.patientId === p.id);
      return {
        id: p.id,
        firstName: toFirstName(p.user?.email),
        email: p.user?.email || null,
        phone: p.user?.phone || null,
        city: p.ville,
        lastVisit: g?._max?.dateHeure ? new Date(g._max.dateHeure).toISOString() : null,
        consultations: g?._count?._all || 0,
      };
    })
    .filter((p) => {
      if (!q) return true;
      return (
        String(p.firstName || '').toLowerCase().includes(q) ||
        String(p.email || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.lastVisit || 0).getTime() - new Date(a.lastVisit || 0).getTime());

  const total = merged.length;
  const start = (currentPage - 1) * pageSize;
  const items = merged.slice(start, start + pageSize);

  return {
    items,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasNextPage: start + items.length < total,
      hasPrevPage: currentPage > 1,
    },
  };
};

const getDoctorReceivedReviews = async ({ userId, page = 1, limit = 15, sort = 'recent' }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found');
  }

  const currentPage = Math.max(1, Number(page));
  const pageSize = Math.min(50, Math.max(1, Number(limit)));
  const orderBy =
    String(sort) === 'best'
      ? [{ note: 'desc' }, { createdAt: 'desc' }]
      : String(sort) === 'worst'
        ? [{ note: 'asc' }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }];

  const [reviews, total] = await Promise.all([
    prisma.avis.findMany({
      where: { doctorId: doctor.id, isVerified: true },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      orderBy,
      include: { patient: { include: { user: { select: { email: true } } } } },
    }),
    prisma.avis.count({ where: { doctorId: doctor.id, isVerified: true } }),
  ]);

  const toFirstName = (email) => {
    const local = String(email || '').split('@')[0].trim();
    const first = local.split(/[._\s-]+/).filter(Boolean)[0] || local;
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : 'Patient';
  };

  return {
    items: reviews.map((r) => ({
      id: r.id,
      rating: r.note,
      comment: r.commentaire || '',
      createdAt: r.createdAt,
      patientFirstName: toFirstName(r.patient?.user?.email),
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

const getDoctorPatientHistory = async ({ userId, patientId, page = 1, limit = 20 }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found');
  }

  const currentPage = Math.max(1, Number(page));
  const pageSize = Math.min(50, Math.max(1, Number(limit)));

  const where = { doctorId: doctor.id, patientId };
  const [items, total] = await Promise.all([
    prisma.rendezVous.findMany({
      where,
      orderBy: [{ dateHeure: 'desc' }],
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      include: {
        cabinet: true,
        avis: { select: { note: true, commentaire: true, isVerified: true } },
        doctorPatientNotes: {
          where: { doctorId: doctor.id },
          orderBy: [{ createdAt: 'desc' }],
          take: 10,
        },
      },
    }),
    prisma.rendezVous.count({ where }),
  ]);

  return {
    items: items.map((rdv) => ({
      id: rdv.id,
      dateTime: rdv.dateHeure.toISOString(),
      status: rdv.statut,
      reason: rdv.motif,
      type: rdv.typeConsultation,
      notes: rdv.notes || null,
      cancellationReason: rdv.cancellationReason || null,
      cabinet: rdv.cabinet
        ? { id: rdv.cabinet.id, name: rdv.cabinet.nom, city: rdv.cabinet.ville, district: rdv.cabinet.quartier }
        : null,
      review: rdv.avis ? { rating: rdv.avis.note, comment: rdv.avis.commentaire || '', verified: rdv.avis.isVerified } : null,
      doctorNotes: rdv.doctorPatientNotes.map((n) => ({ id: n.id, note: n.note, createdAt: n.createdAt.toISOString() })),
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

const getDoctorPatientProfile = async ({ userId, patientId }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found');
  }

  // Security: Check if doctor has ever had an appointment with this patient
  const hasRelationship = await prisma.rendezVous.findFirst({
    where: {
      doctorId: doctor.id,
      patientId: patientId,
    },
  });

  if (!hasRelationship) {
    throw new HttpError(403, 'You do not have a medical relationship with this patient');
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      user: {
        select: {
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!patient) {
    throw new HttpError(404, 'Patient not found');
  }

  const toDisplayName = (email) => {
    const local = String(email || '').split('@')[0].trim();
    const parts = local.split(/[._\s-]+/).filter(Boolean);
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') || 'Patient';
  };

  return {
    id: patient.id,
    nomComplet: toDisplayName(patient.user?.email),
    email: patient.user?.email,
    phone: patient.user?.phone,
    dateOfNaissance: patient.dateOfNaissance,
    sexe: patient.sexe,
    adresse: patient.adresse,
    ville: patient.ville,
    groupeSanguin: patient.groupeSanguin,
    antecedents: patient.antecedents,
    lastVisitAt: hasRelationship.dateHeure,
  };
};


const getDoctorStats = async ({ userId }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!doctor) {
    throw new HttpError(404, 'Doctor profile not found');
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  startOfWeek.setDate(startOfWeek.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const [thisMonthCount, prevMonthCount, weekAppointments, avgNote, noteCount, activeAvailabilities] = await Promise.all([
    prisma.rendezVous.count({ where: { doctorId: doctor.id, createdAt: { gte: startOfMonth } } }),
    prisma.rendezVous.count({ where: { doctorId: doctor.id, createdAt: { gte: startOfPrevMonth, lt: endOfPrevMonth } } }),
    prisma.rendezVous.findMany({
      where: { doctorId: doctor.id, dateHeure: { gte: startOfWeek, lt: endOfWeek } },
      select: { dateHeure: true },
    }),
    prisma.avis.aggregate({ where: { doctorId: doctor.id, isVerified: true }, _avg: { note: true } }),
    prisma.avis.count({ where: { doctorId: doctor.id, isVerified: true } }),
    prisma.disponibilite.count({ where: { doctorId: doctor.id, isActive: true } }),
  ]);

  const byDay = {};
  weekAppointments.forEach((a) => {
    const key = new Date(a.dateHeure).toISOString().slice(0, 10);
    byDay[key] = (byDay[key] || 0) + 1;
  });

  const series = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { day: key, count: byDay[key] || 0 };
  });

  const evolution = prevMonthCount === 0 ? (thisMonthCount > 0 ? 100 : 0) : Math.round(((thisMonthCount - prevMonthCount) / prevMonthCount) * 100);

  // Occupation is approximated using active availabilities count as a proxy (no slot table).
  const occupationRate = activeAvailabilities ? Math.min(100, Math.round((thisMonthCount / (activeAvailabilities * 8)) * 100)) : 0;

  return {
    thisMonthAppointments: thisMonthCount,
    evolutionVsPrevMonthPct: evolution,
    occupationRatePct: occupationRate,
    averageRating: avgNote._avg.note ? Number(avgNote._avg.note.toFixed(1)) : 0,
    reviewsCount: noteCount,
    weekSeries: series,
  };
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
  uploadDoctorProfilePhoto,
  getDoctorAgenda,
  listDoctorPatients,
  getDoctorReceivedReviews,
  getDoctorPatientHistory,
  getDoctorPatientProfile,
  getDoctorStats,
};


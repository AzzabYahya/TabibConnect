const { Prisma } = require('@prisma/client');

const prisma = require('../config/prisma');
const HttpError = require('../utils/httpError');

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

const createCabinet = async ({ userId, payload }) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!doctor) {
    throw new HttpError(403, 'Only authenticated doctors can create cabinets');
  }

  const cabinet = await prisma.cabinet.create({
    data: {
      nom: payload.nom,
      adresse: payload.adresse,
      ville: payload.ville,
      quartier: payload.quartier,
      latitude: new Prisma.Decimal(payload.latitude),
      longitude: new Prisma.Decimal(payload.longitude),
      phone: payload.phone,
      photos: toStringList(payload.photos),
      doctorCabinets: {
        create: {
          doctorId: doctor.id,
        },
      },
    },
    include: {
      doctorCabinets: {
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
      },
    },
  });

  return {
    ...cabinet,
    latitude: Number(cabinet.latitude),
    longitude: Number(cabinet.longitude),
  };
};

const getCabinetDetails = async (cabinetId) => {
  const cabinet = await prisma.cabinet.findUnique({
    where: { id: cabinetId },
    include: {
      doctorCabinets: {
        include: {
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
      },
      disponibilites: {
        where: {
          isActive: true,
        },
        orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }],
      },
    },
  });

  if (!cabinet) {
    throw new HttpError(404, 'Cabinet not found');
  }

  return {
    ...cabinet,
    latitude: Number(cabinet.latitude),
    longitude: Number(cabinet.longitude),
  };
};

const findNearbyCabinets = async ({ latitude, longitude, radius }) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const radiusKm = Number(radius || 10);

  const cabinets = await prisma.$queryRaw`
    SELECT *
    FROM (
      SELECT
        c.id,
        c.nom,
        c.adresse,
        c.ville,
        c.quartier,
        c.latitude,
        c.longitude,
        c.phone,
        c.photos,
        c."createdAt",
        c."updatedAt",
        (
          6371 * acos(
            cos(radians(${lat}))
            * cos(radians((c.latitude)::double precision))
            * cos(radians((c.longitude)::double precision) - radians(${lng}))
            + sin(radians(${lat}))
            * sin(radians((c.latitude)::double precision))
          )
        ) AS distance_km
      FROM "Cabinet" c
    ) distances
    WHERE distance_km <= ${radiusKm}
    ORDER BY distance_km ASC
    LIMIT 100
  `;

  return cabinets.map((cabinet) => ({
    ...cabinet,
    latitude: Number(cabinet.latitude),
    longitude: Number(cabinet.longitude),
    distanceKm: Number(cabinet.distance_km),
  }));
};

module.exports = {
  createCabinet,
  findNearbyCabinets,
  getCabinetDetails,
};

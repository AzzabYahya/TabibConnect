const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  return false;
};

async function testListDoctors(filters) {
  const andClauses = [
    {
      user: {
        isVerified: true,
      },
    },
  ];

  if (filters.q) {
    andClauses.push({
      OR: [
        { nomComplet: { contains: filters.q, mode: 'insensitive' } },
        { specialite: { contains: filters.q, mode: 'insensitive' } },
        { user: { email: { contains: filters.q, mode: 'insensitive' } } },
      ],
    });
  }

  if (filters.specialite) {
    andClauses.push({ specialite: { contains: filters.specialite, mode: 'insensitive' } });
  }

  if (toBoolean(filters.accepteAssurance)) {
    andClauses.push({ accepteAssurance: true });
  }

  if (filters.maxTarif !== undefined && Number(filters.maxTarif) < 2000) {
    andClauses.push({ tarifConsultation: { lte: filters.maxTarif } });
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
  console.log('WHERE:', JSON.stringify(where, null, 2));
  
  const total = await prisma.doctor.count({ where });
  console.log('TOTAL MATCHING:', total);
}

// Default frontend params
const defaultParams = {
  page: 1,
  limit: 8,
  ville: '',
  specialite: '',
  maxTarif: 2000,
  accepteAssurance: false,
  minNote: 0,
  sexe: 'TOUT',
  videoOnly: false
};

testListDoctors(defaultParams).catch(console.error).finally(() => prisma.$disconnect());

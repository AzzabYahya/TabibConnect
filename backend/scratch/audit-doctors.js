const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.doctor.count();
  const verified = await prisma.doctor.count({ where: { user: { isVerified: true } } });
  const withCabinets = await prisma.doctor.count({ where: { doctorCabinets: { some: {} } } });
  const withSpecialite = await prisma.doctor.count({ where: { NOT: { specialite: '' } } });
  
  console.log(`Total: ${total}`);
  console.log(`Verified: ${verified}`);
  console.log(`With Cabinets: ${withCabinets}`);
  console.log(`With Specialite: ${withSpecialite}`);
  
  const test10 = await prisma.doctor.findMany({
    where: { user: { isVerified: true } },
    take: 10,
    select: { id: true, nomComplet: true, specialite: true }
  });
  console.log('Sample 10 doctors:', test10.map(d => d.nomComplet).join(', '));
}

main().catch(console.error).finally(() => prisma.$disconnect());

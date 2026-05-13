const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const where = {
    user: {
      isVerified: true,
    },
  };
  const count = await prisma.doctor.count({ where });
  const doctors = await prisma.doctor.findMany({ 
    where,
    select: { id: true, nomComplet: true, user: { select: { isVerified: true } } }
  });
  console.log(`Count: ${count}`);
  console.log(`Doctors matching isVerified: true: ${doctors.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const verifiedCount = await prisma.user.count({ where: { role: 'DOCTOR', isVerified: true } });
  const totalDoctors = await prisma.doctor.count();
  console.log(`Verified Doctors: ${verifiedCount}`);
  console.log(`Total Doctors: ${totalDoctors}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

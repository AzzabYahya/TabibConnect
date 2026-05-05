/**
 * Replace all doctor profile photos, giving each doctor their OWN unique file.
 * This avoids the shared file path problem from the seed data.
 */
const path = require('path');
const fs = require('fs');
const prisma = require('../src/config/prisma');

const FEMALE_PHOTO = path.resolve(__dirname, '../../frontend/public/docs/screenshots/medecin_femme.jpg');
const MALE_PHOTO = path.resolve(__dirname, '../../frontend/public/docs/screenshots/medecin_homme.png');

const FEMALE_NAMES = /salma|khadija|fatima|meryem|nadia|laila|sanae|mina|hajar|amina|nour|rania|sara|hind|zineb|loubna|ghita|imane|siham|naima|samira|asmae|karima|leila|lamia|houda|souad|wafa|ilham|nawal|meriem|bouchra|mariam/i;

function isFemale(nomComplet, email) {
  const text = `${nomComplet || ''} ${email || ''}`.toLowerCase();
  return FEMALE_NAMES.test(text);
}

async function main() {
  const uploadsDir = path.resolve(process.cwd(), 'uploads/documents');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const doctors = await prisma.doctor.findMany({
    select: {
      id: true,
      nomComplet: true,
      user: { select: { email: true } },
    },
  });

  console.log(`Processing ${doctors.length} doctors...`);

  for (const doctor of doctors) {
    const female = isFemale(doctor.nomComplet, doctor.user?.email);
    const sourcePhoto = female ? FEMALE_PHOTO : MALE_PHOTO;
    const ext = female ? '.jpg' : '.png';
    const mimeType = female ? 'image/jpeg' : 'image/png';

    // Create a UNIQUE file for this doctor
    const uniqueFileName = `profile-${doctor.id}${ext}`;
    const uniqueFilePath = path.join(uploadsDir, uniqueFileName);
    fs.copyFileSync(sourcePhoto, uniqueFilePath);
    const fileSize = fs.statSync(uniqueFilePath).size;

    // Delete all existing profile photo records for this doctor
    await prisma.doctorDocument.deleteMany({
      where: { doctorId: doctor.id, isProfilePhoto: true },
    });

    // Create a fresh record with the unique path
    await prisma.doctorDocument.create({
      data: {
        doctorId: doctor.id,
        fileName: uniqueFileName,
        filePath: uniqueFilePath,
        mimeType,
        size: fileSize,
        isProfilePhoto: true,
      },
    });

    console.log(`  ✓ ${doctor.nomComplet} (${female ? 'F' : 'M'}) → ${uniqueFileName}`);
  }

  console.log(`\nDone! All ${doctors.length} doctors now have unique profile photos.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});

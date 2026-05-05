const path = require('path');
const fs = require('fs');

const prisma = require('../config/prisma');
const HttpError = require('../utils/httpError');

const getDoctorProfilePhoto = async (req, res) => {
  const doctorId = req.params.id;

  const doc =
    (await prisma.doctorDocument.findFirst({
      where: { doctorId, isProfilePhoto: true },
      orderBy: { createdAt: 'desc' },
      select: { filePath: true, mimeType: true },
    }))
    || (await prisma.doctorDocument.findFirst({
      where: { doctorId, mimeType: { startsWith: 'image/' } },
      orderBy: { createdAt: 'desc' },
      select: { filePath: true, mimeType: true },
    }));

  if (!doc) {
    // Serve gender-based default avatar for doctors without a photo
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { nomComplet: true, user: { select: { email: true } } },
    });

    const FEMALE_NAMES = /salma|khadija|fatima|meryem|nadia|laila|sanae|mina|hajar|amina|nour|rania|sara|hind|zineb|loubna|ghita|imane|siham|naima|samira|asmae|karima|leila|lamia|houda|souad|wafa|ilham|nawal|meriem|bouchra|mariam/i;
    const text = `${doctor?.nomComplet || ''} ${doctor?.user?.email || ''}`.toLowerCase();
    const isFemale = FEMALE_NAMES.test(text);

    const defaultPhoto = path.resolve(
      __dirname,
      '../../..',
      'frontend/public/docs/screenshots',
      isFemale ? 'medecin_femme.jpg' : 'medecin_homme.png'
    );

    if (fs.existsSync(defaultPhoto)) {
      res.setHeader('Content-Type', isFemale ? 'image/jpeg' : 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.sendFile(defaultPhoto);
    }

    throw new HttpError(404, 'Profile photo not found');
  }

  const resolved = path.resolve(doc.filePath);
  const uploadsRoot = path.resolve(process.cwd(), 'uploads');
  const normalizedResolved = path.normalize(resolved);
  const normalizedRoot = path.normalize(uploadsRoot);

  if (!normalizedResolved.startsWith(normalizedRoot + path.sep)) {
    throw new HttpError(400, 'Invalid file path');
  }

  if (!fs.existsSync(resolved)) {
    throw new HttpError(404, 'File not found on disk');
  }

  res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.sendFile(resolved);
};

module.exports = {
  getDoctorProfilePhoto,
};


const path = require('path');
const fs = require('fs');

const prisma = require('../config/prisma');
const HttpError = require('../utils/httpError');

const getPatientProfilePhoto = async (req, res) => {
  const patientId = req.params.id;

  const doc =
    (await prisma.patientDocument.findFirst({
      where: { patientId, isProfilePhoto: true },
      orderBy: { createdAt: 'desc' },
      select: { filePath: true, mimeType: true },
    })) ||
    (await prisma.patientDocument.findFirst({
      where: { patientId, mimeType: { startsWith: 'image/' } },
      orderBy: { createdAt: 'desc' },
      select: { filePath: true, mimeType: true },
    }));

  if (!doc) {
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
  getPatientProfilePhoto,
};

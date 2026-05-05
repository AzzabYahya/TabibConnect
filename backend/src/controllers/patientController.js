const prisma = require('../config/prisma');
const HttpError = require('../utils/httpError');

const uploadPatientProfilePhoto = async (req, res) => {
  const userId = req.user.id;
  const file = req.file;

  if (!file || !String(file.mimetype || '').startsWith('image/')) {
    throw new HttpError(400, 'A valid profile image is required');
  }

  const patient = await prisma.patient.findUnique({ where: { userId }, select: { id: true } });
  if (!patient) {
    throw new HttpError(404, 'Patient profile not found');
  }

  const createdDocument = await prisma.patientDocument.create({
    data: {
      patientId: patient.id,
      fileName: file.originalname,
      filePath: file.path,
      mimeType: file.mimetype,
      size: file.size,
      isProfilePhoto: false,
    },
  });

  // Create a patient change request so admin can validate the new photo
  await prisma.patientChangeRequest.create({
    data: {
      patientId: patient.id,
      reason: 'Changement photo de profil (validation admin requise)',
      payload: {
        documentId: createdDocument.id,
        fileName: createdDocument.fileName,
        mimeType: createdDocument.mimeType,
        size: createdDocument.size,
        uploadedAt: new Date().toISOString(),
      },
    },
  });

  return res.status(201).json({ status: 'success', data: { uploaded: true, requiresAdminValidation: true, documentId: createdDocument.id } });
};

module.exports = {
  uploadPatientProfilePhoto,
};

const prisma = require('../config/prisma');
const HttpError = require('../utils/httpError');
const { logAction } = require('../services/auditService');

const getPatientProfile = async (req, res) => {
  const userId = req.user.id;

  const patient = await prisma.patient.findUnique({
    where: { userId },
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
    throw new HttpError(404, 'Patient profile not found');
  }

  await logAction({
    userId,
    action: 'PATIENT_PROFILE_VIEW',
    resource: `Patient:${patient.id}`,
    req,
  });

  res.status(200).json({
    status: 'success',
    data: patient,
  });
};

const updatePatientProfile = async (req, res) => {
  const userId = req.user.id;
  const payload = req.body;

  const patient = await prisma.patient.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!patient) {
    throw new HttpError(404, 'Patient profile not found');
  }

  // Create a change request instead of immediate update
  await prisma.patientChangeRequest.create({
    data: {
      patientId: patient.id,
      reason: 'Mise à jour des informations personnelles',
      payload: {
        adresse: payload.adresse,
        ville: payload.ville,
        groupeSanguin: payload.groupeSanguin,
        antecedents: payload.antecedents,
      },
    },
  });

  await logAction({
    userId,
    action: 'PATIENT_PROFILE_CHANGE_REQUEST_SUBMITTED',
    resource: `Patient:${patient.id}`,
    req,
  });

  res.status(200).json({
    status: 'success',
    message: 'Request submitted for administrative validation.',
  });
};


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

  await logAction({
    userId,
    action: 'PATIENT_PHOTO_UPLOAD',
    resource: `Patient:${patient.id}`,
    req,
  });

  return res.status(201).json({ status: 'success', data: { uploaded: true, requiresAdminValidation: true, documentId: createdDocument.id } });
};

module.exports = {
  getPatientProfile,
  updatePatientProfile,
  uploadPatientProfilePhoto,
};


const path = require('path');
const fs = require('fs');

const prisma = require('../config/prisma');
const HttpError = require('../utils/httpError');

const getDoctorDocument = async (req, res) => {
  const { doctorId, documentId } = req.params;

  const document = await prisma.doctorDocument.findFirst({
    where: { id: documentId, doctorId },
    select: { filePath: true, mimeType: true, fileName: true },
  });

  if (!document) {
    throw new HttpError(404, 'Document not found');
  }

  const resolved = path.resolve(document.filePath);
  const uploadsRoot = path.resolve(process.cwd(), 'uploads');
  const normalizedResolved = path.normalize(resolved);
  const normalizedRoot = path.normalize(uploadsRoot);

  if (!normalizedResolved.startsWith(normalizedRoot + path.sep)) {
    throw new HttpError(400, 'Invalid file path');
  }

  if (!fs.existsSync(resolved)) {
    throw new HttpError(404, 'File not found on disk');
  }

  res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
  return res.sendFile(resolved);
};

const getPatientDocument = async (req, res) => {
  const { patientId, documentId } = req.params;

  const document = await prisma.patientDocument.findFirst({
    where: { id: documentId, patientId },
    select: { filePath: true, mimeType: true },
  });

  if (!document) {
    throw new HttpError(404, 'Document not found');
  }

  const resolved = path.resolve(document.filePath);
  if (!fs.existsSync(resolved)) {
    throw new HttpError(404, 'File not found on disk');
  }

  res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
  return res.sendFile(resolved);
};

const getUserCinDocument = async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { doctor: true, patient: true },
  });

  if (!user) throw new HttpError(404, 'User not found');

  let filePath, mimeType;
  if (user.role === 'DOCTOR' && user.doctor) {
    filePath = user.doctor.cinDocumentFilePath;
    mimeType = user.doctor.cinDocumentMimeType;
  } else if (user.role === 'PATIENT' && user.patient) {
    filePath = user.patient.cinDocumentFilePath;
    mimeType = user.patient.cinDocumentMimeType;
  }

  if (!filePath) {
    throw new HttpError(404, 'CIN document not found for this user');
  }

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new HttpError(404, 'File not found on disk');
  }

  res.setHeader('Content-Type', mimeType || 'application/octet-stream');
  return res.sendFile(resolved);
};

module.exports = {
  getDoctorDocument,
  getPatientDocument,
  getUserCinDocument,
};



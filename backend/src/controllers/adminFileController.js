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

  if (!resolved.startsWith(uploadsRoot)) {
    throw new HttpError(400, 'Invalid file path');
  }

  if (!fs.existsSync(resolved)) {
    throw new HttpError(404, 'File not found on disk');
  }

  res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
  return res.sendFile(resolved);
};

module.exports = {
  getDoctorDocument,
};


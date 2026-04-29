const fs = require('fs');
const path = require('path');
const multer = require('multer');

const env = require('../config/env');

const uploadDirectory = path.resolve(process.cwd(), env.uploadDocumentsDir);
fs.mkdirSync(uploadDirectory, { recursive: true });

const sanitizeFileName = (fileName) => {
  return fileName
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase();
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (req, file, callback) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${uniqueSuffix}-${sanitizeFileName(file.originalname)}`);
  },
});

const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

const fileFilter = (req, file, callback) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    return callback(null, true);
  }

  return callback(new Error('Only PDF, JPG and PNG files are accepted'));
};

const uploadDoctorDocuments = multer({
  storage,
  fileFilter,
  limits: {
    files: 5,
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = uploadDoctorDocuments;

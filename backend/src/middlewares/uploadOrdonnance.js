const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDirectory = path.resolve(process.cwd(), 'uploads', 'ordonnances');
fs.mkdirSync(uploadDirectory, { recursive: true });

const sanitizeFileName = (fileName) =>
  String(fileName || '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase();

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (_req, file, callback) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${uniqueSuffix}-${sanitizeFileName(file.originalname)}`);
  },
});

const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

const fileFilter = (_req, file, callback) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    return callback(null, true);
  }
  return callback(new Error('Only PDF, JPG and PNG files are accepted'));
};

const uploadOrdonnance = multer({
  storage,
  fileFilter,
  limits: {
    files: 1,
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = uploadOrdonnance;

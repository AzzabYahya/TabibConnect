const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details;

  if (err.code === 'P2002') {
    statusCode = 409;
    message = 'A resource with unique fields already exists';
    details = err.meta;
  }

  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'The requested resource was not found';
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token is invalid or expired';
  }

  if (err.name === 'MulterError') {
    statusCode = 400;
    message = err.message;
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'Uploaded file is too large';
  }

  if (err.code === 'EBADCSRFTOKEN') {
    statusCode = 403;
    message = 'Invalid CSRF token';
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(details && { details }),
    ...(env.nodeEnv !== 'production' && { stack: err.stack }),
  });
};

module.exports = errorHandler;

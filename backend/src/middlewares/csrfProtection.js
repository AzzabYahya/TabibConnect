const { doubleCsrf } = require('csrf-csrf');

const env = require('../config/env');

const {
  doubleCsrfProtection,
  generateCsrfToken,
  invalidCsrfTokenError,
} = doubleCsrf({
  getSecret: () => env.csrfSecret,
  getSessionIdentifier: (req) => {
    // If the user is authenticated, use their ID for a stable CSRF session.
    // Otherwise, fallback to UA + IP for unauthenticated flows.
    if (req.user && req.user.id) {
      return req.user.id;
    }
    const userAgent = req.headers['user-agent'] || 'unknown-agent';
    const ip = req.ip || 'unknown-ip';
    return `${userAgent}:${ip}`;
  },

  cookieName: env.csrfCookieName,
  cookieOptions: {
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
  },
  getCsrfTokenFromRequest: (req) => req.headers[env.csrfHeaderName.toLowerCase()],
});

const issueCsrfToken = (req, res) => {
  const csrfToken = generateCsrfToken(req, res);
  res.status(200).json({ csrfToken });
};

const csrfErrorHandler = (error, req, res, next) => {
  if (error === invalidCsrfTokenError || error.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      status: 'error',
      message: 'Invalid CSRF token',
    });
  }

  return next(error);
};

module.exports = {
  csrfErrorHandler,
  doubleCsrfProtection,
  issueCsrfToken,
};

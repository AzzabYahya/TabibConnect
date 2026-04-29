const rateLimit = require('express-rate-limit');

const env = require('../config/env');

const noopLimiter = (req, res, next) => next();

const authRateLimiter = rateLimit({
  windowMs: env.authRateLimitWindowMs,
  max: env.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts. Please try again later.',
  },
});

module.exports = env.nodeEnv === 'development' ? noopLimiter : authRateLimiter;

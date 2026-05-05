const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const noopLimiter = (req, res, next) => next();

const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
  },
  keyGenerator: (req) => {
    return req.user?.id || req.ip; // Rate limit by user ID if authenticated, else IP
  },
});

module.exports = env.nodeEnv === 'development' ? noopLimiter : generalRateLimiter;

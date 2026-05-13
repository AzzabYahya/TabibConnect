const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const env = require('../config/env');

const DURATION_UNITS_IN_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

const durationToMs = (duration, fallbackMs) => {
  if (typeof duration === 'number' && Number.isFinite(duration)) {
    return duration;
  }

  if (typeof duration !== 'string') {
    return fallbackMs;
  }

  const match = duration.trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    return fallbackMs;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  return amount * DURATION_UNITS_IN_MS[unit];
};

const getFutureDateFromDuration = (duration, fallbackMs) => {
  const durationInMs = durationToMs(duration, fallbackMs);
  return new Date(Date.now() + durationInMs);
};

const createAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      tokenType: 'access',
    },
    env.jwtAccessSecret,
    {
      expiresIn: env.jwtAccessExpiresIn,
    }
  );
};

const createRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      tokenType: 'refresh',
      jti: crypto.randomUUID(),
    },
    env.jwtRefreshSecret,
    {
      expiresIn: env.jwtRefreshExpiresIn,
    }
  );
};

const generateOpaqueToken = () => crypto.randomBytes(32).toString('hex');

const hashOpaqueToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const getRefreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax',
  path: '/api/v1/auth',
  maxAge: durationToMs(env.jwtRefreshExpiresIn, 7 * 24 * 60 * 60 * 1000),
});


const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie(env.refreshTokenCookieName, refreshToken, getRefreshTokenCookieOptions());
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie(env.refreshTokenCookieName, {
    ...getRefreshTokenCookieOptions(),
    maxAge: undefined,
  });
};

const getTokenFromAuthorizationHeader = (authorizationHeader) => {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice('Bearer '.length).trim();
};

module.exports = {
  clearRefreshTokenCookie,
  createAccessToken,
  createRefreshToken,
  durationToMs,
  generateOpaqueToken,
  getFutureDateFromDuration,
  getTokenFromAuthorizationHeader,
  hashOpaqueToken,
  setRefreshTokenCookie,
};

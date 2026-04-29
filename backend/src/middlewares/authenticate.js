const jwt = require('jsonwebtoken');

const prisma = require('../config/prisma');
const env = require('../config/env');
const HttpError = require('../utils/httpError');
const { getTokenFromAuthorizationHeader } = require('../utils/tokenUtils');

const authenticate = async (req, res, next) => {
  try {
    const token = getTokenFromAuthorizationHeader(req.headers.authorization);

    if (!token) {
      throw new HttpError(401, 'Authentication token is required');
    }

    const payload = jwt.verify(token, env.jwtAccessSecret);

    if (payload.tokenType !== 'access') {
      throw new HttpError(401, 'Invalid authentication token type');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        email: true,
        isVerified: true,
      },
    });

    if (!user) {
      throw new HttpError(401, 'Authentication token is no longer valid');
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return next(new HttpError(401, 'Authentication token is invalid or expired'));
    }

    return next(error);
  }
};

module.exports = authenticate;

const HttpError = require('../utils/httpError');

const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new HttpError(401, 'Authentication is required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, 'You are not allowed to access this resource'));
    }

    return next();
  };
};

module.exports = authorize;

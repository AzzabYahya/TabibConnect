/**
 * Middleware to protect against common injection patterns.
 * Focuses on NoSQL injection ($ operator) and Prototype Pollution.
 * XSS is handled at the output layer (React escaping, Email templates).
 */
const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const sanitizedObject = {};

    Object.keys(value).forEach((key) => {
      // Prevent NoSQL Injection ($) and Prototype Pollution (__proto__, constructor)
      if (key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor') {
        return;
      }

      sanitizedObject[key] = sanitizeValue(value[key]);
    });

    return sanitizedObject;
  }

  // We no longer blindly strip < > to avoid data corruption.
  // Validation (Zod/Joi) should be used for specific field constraints.
  return value;
};

const sanitizeInputs = (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};

module.exports = sanitizeInputs;


const sanitizeString = (value) => value.trim().replace(/[<>]/g, '');

const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    const sanitizedObject = {};

    Object.keys(value).forEach((key) => {
      if (key.startsWith('$') || key.includes('.')) {
        return;
      }

      sanitizedObject[key] = sanitizeValue(value[key]);
    });

    return sanitizedObject;
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  return value;
};

const sanitizeInputs = (req, res, next) => {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  next();
};

module.exports = sanitizeInputs;

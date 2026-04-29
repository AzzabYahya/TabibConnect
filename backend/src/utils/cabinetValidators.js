const { body, param, query } = require('express-validator');

const createCabinetValidator = [
  body('nom').trim().isLength({ min: 2, max: 150 }).escape(),
  body('adresse').trim().isLength({ min: 5, max: 255 }).escape(),
  body('ville').trim().isLength({ min: 2, max: 120 }).escape(),
  body('quartier').trim().isLength({ min: 2, max: 120 }).escape(),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('phone').trim().matches(/^\+?[0-9]{9,15}$/),
  body('photos').optional(),
];

const cabinetIdValidator = [param('id').isString().isLength({ min: 10, max: 40 })];

const nearbyCabinetsValidator = [
  query('lat').isFloat({ min: -90, max: 90 }),
  query('lng').isFloat({ min: -180, max: 180 }),
  query('radius').optional().isFloat({ gt: 0, max: 100 }),
];

module.exports = {
  cabinetIdValidator,
  createCabinetValidator,
  nearbyCabinetsValidator,
};

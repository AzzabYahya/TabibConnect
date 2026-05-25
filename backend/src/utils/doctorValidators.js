const { body, param, query } = require('express-validator');

const doctorListValidator = [
  query('q').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 120 }),
  query('specialite').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 120 }),
  query('ville').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 120 }),
  query('availableToday').optional().isBoolean().toBoolean(),
  query('accepteAssurance').optional().isBoolean().toBoolean(),
  query('minNote').optional().isFloat({ min: 0, max: 5 }),
  query('maxTarif').optional().isFloat({ min: 0 }),
  query('langue').optional().trim().isLength({ min: 2, max: 50 }),
  query('langues').optional().trim().isLength({ min: 2, max: 120 }),
  query('videoOnly').optional().isBoolean().toBoolean(),
  query('sexe').optional().isIn(['TOUT', 'HOMME', 'FEMME']),
];

const doctorIdValidator = [param('id').isString().isLength({ min: 10, max: 40 })];

const doctorSearchValidator = [
  query('q').trim().isLength({ min: 2, max: 120 }),
  query('specialite').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 120 }),
  query('ville').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 120 }),
  query('maxTarif').optional().isFloat({ min: 0 }),
  query('minNote').optional().isFloat({ min: 0, max: 5 }),
  query('accepteAssurance').optional().isBoolean().toBoolean(),
  query('videoOnly').optional().isBoolean().toBoolean(),
  query('sexe').optional().isIn(['TOUT', 'HOMME', 'FEMME']),
];



const doctorUpdateProfileValidator = [
  body('nomComplet').optional().trim().isLength({ min: 3, max: 150 }).escape(),
  body('specialite').optional().trim().isLength({ min: 3, max: 120 }).escape(),
  body('diplomes').optional().isString(),
  body('languesParlees').optional().isString(),
  body('tarifConsultation').optional().isFloat({ gt: 0 }),
  body('accepteAssurance').optional().isBoolean().toBoolean(),
  body('assurancesAcceptees').optional().isString(),
  body('bio').optional().trim().isLength({ max: 2000 }).escape(),
  body('experience').optional().isInt({ min: 0, max: 80 }).toInt(),
];

const doctorAvailabilityValidator = [
  param('id').isString().isLength({ min: 10, max: 40 }),
  query('date').isISO8601(),
];

const doctorReviewsValidator = [
  param('id').isString().isLength({ min: 10, max: 40 }),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
];

const doctorCreateAvailabilityValidator = [
  body('cabinetId').isString().isLength({ min: 10, max: 40 }),
  body('jourSemaine').isIn(['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE']),
  body('heureDebut').matches(/^\d{2}:\d{2}$/),
  body('heureFin').matches(/^\d{2}:\d{2}$/),
  body('dureeConsultation').isInt({ min: 5, max: 240 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
];

const doctorUpdateAvailabilityValidator = [
  param('availabilityId').isString().isLength({ min: 10, max: 40 }),
  body('jourSemaine').optional().isIn(['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE']),
  body('heureDebut').optional().matches(/^\d{2}:\d{2}$/),
  body('heureFin').optional().matches(/^\d{2}:\d{2}$/),
  body('dureeConsultation').optional().isInt({ min: 5, max: 240 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
];

const doctorDeleteAvailabilityValidator = [
  param('availabilityId').isString().isLength({ min: 10, max: 40 }),
];

const doctorSubmitChangeRequestValidator = [
  body('type').isIn(['PROFILE_UPDATE', 'LOCATION_CREATE', 'LOCATION_UPDATE']),
  body('reason').trim().isLength({ min: 5, max: 1000 }).escape(),
  body('data').isObject(),
];

const doctorChangeRequestIdValidator = [
  param('requestId').isString().isLength({ min: 10, max: 40 }),
];

module.exports = {
  doctorAvailabilityValidator,
  doctorIdValidator,
  doctorListValidator,
  doctorReviewsValidator,
  doctorSearchValidator,
  doctorCreateAvailabilityValidator,
  doctorUpdateAvailabilityValidator,
  doctorDeleteAvailabilityValidator,
  doctorSubmitChangeRequestValidator,
  doctorChangeRequestIdValidator,
  doctorUpdateProfileValidator,
};

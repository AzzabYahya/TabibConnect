const { body, param } = require('express-validator');

const createAppointmentValidator = [
  body('doctorId').isString().isLength({ min: 10, max: 40 }),
  body('disponibiliteId').isString().isLength({ min: 10, max: 40 }),
  body('cabinetId').optional().isString().isLength({ min: 10, max: 40 }),
  body('motif').trim().isLength({ min: 3, max: 500 }).escape(),
  body('typeConsultation').isIn(['PRESENTIEL', 'TELECONSULTATION']),
  body('methodePaiement').isIn(['CASH', 'CMI']),
  body('acceptedGeneralTerms').isBoolean().toBoolean().custom((value) => value === true).withMessage('General booking terms must be accepted'),
  body('acceptedCashPolicy')
    .isBoolean()
    .toBoolean()
    .custom((value, { req }) => req.body.methodePaiement !== 'CASH' || value === true)
    .withMessage('Cash payment conditions must be accepted when paying by cash'),
  body('notes').optional().trim().isLength({ max: 2000 }).escape(),
  body('dateHeure').isISO8601(),
];

const createReviewValidator = [
  param('id').isString().isLength({ min: 10, max: 40 }),
  body('note').isInt({ min: 1, max: 5 }).toInt(),
  body('commentaire').optional().trim().isLength({ max: 1000 }).escape(),
];

const appointmentIdValidator = [param('id').isString().isLength({ min: 10, max: 40 })];

const cancelAppointmentValidator = [
  param('id').isString().isLength({ min: 10, max: 40 }),
  body('reason').trim().isLength({ min: 3, max: 500 }).escape(),
];

const rescheduleAppointmentValidator = [
  param('id').isString().isLength({ min: 10, max: 40 }),
  body('disponibiliteId').isString().isLength({ min: 10, max: 40 }),
  body('cabinetId').optional().isString().isLength({ min: 10, max: 40 }),
  body('dateHeure').isISO8601(),
  body('reason').optional().trim().isLength({ max: 500 }).escape(),
];

const createDoctorPatientNoteValidator = [
  param('id').isString().isLength({ min: 10, max: 40 }),
  body('note').trim().isLength({ min: 3, max: 2000 }).escape(),
  body('isVisibleToPeers').optional().isBoolean().toBoolean(),
];

module.exports = {
  appointmentIdValidator,
  cancelAppointmentValidator,
  createAppointmentValidator,
  createReviewValidator,
  createDoctorPatientNoteValidator,
  rescheduleAppointmentValidator,
};

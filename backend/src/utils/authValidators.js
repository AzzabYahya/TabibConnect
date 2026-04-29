const { body, param } = require('express-validator');

const strongPasswordRules = body('password')
  .isLength({ min: 8, max: 64 })
  .withMessage('Password must contain 8 to 64 characters')
  .matches(/[a-z]/)
  .withMessage('Password must include a lowercase letter')
  .matches(/[A-Z]/)
  .withMessage('Password must include an uppercase letter')
  .matches(/[0-9]/)
  .withMessage('Password must include a number');

const registerPatientValidator = [
  body('email').isEmail().normalizeEmail(),
  strongPasswordRules,
  body('phone').trim().matches(/^\+?[0-9]{9,15}$/),
  body('cin').trim().toUpperCase().matches(/^[A-Z]{1,2}[0-9]{4,8}$/),
  body('dateOfNaissance').isISO8601(),
  body('sexe').isIn(['HOMME', 'FEMME']),
  body('adresse').trim().isLength({ min: 5, max: 255 }).escape(),
  body('ville').trim().isLength({ min: 2, max: 80 }).escape(),
  body('groupeSanguin')
    .optional()
    .isIn(['O_POS', 'O_NEG', 'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG']),
  body('antecedents').optional().trim().isLength({ max: 2000 }).escape(),
];

const registerDoctorValidator = [
  body('nomComplet').optional().trim().isLength({ min: 3, max: 150 }).escape(),
  body('email').isEmail().normalizeEmail(),
  strongPasswordRules,
  body('phone').trim().matches(/^\+?[0-9]{9,15}$/),
  body('inpe').trim().isLength({ min: 4, max: 60 }),
  body('specialite').trim().isLength({ min: 3, max: 120 }).escape(),
  body('diplomes').trim().isLength({ min: 2 }),
  body('languesParlees').trim().isLength({ min: 2 }),
  body('tarifConsultation').isFloat({ gt: 0 }),
  body('accepteAssurance').optional().isBoolean().toBoolean(),
  body('assurancesAcceptees').optional().trim(),
  body('bio').optional().trim().isLength({ max: 2000 }).escape(),
  body('experience').isInt({ min: 0, max: 80 }).toInt(),
];

const loginValidator = [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 8, max: 64 }),
];

const deleteAccountValidator = [
  body('reason').isIn(['PLUS_BESOIN', 'CONFIDENTIALITE', 'TROP_COUTEUX', 'AUTRE']),
  body('reasonDetail').optional().trim().isLength({ max: 500 }).escape(),
  body('acceptDeletionTerms')
    .isBoolean()
    .toBoolean()
    .custom((value) => value === true)
    .withMessage('Deletion terms must be accepted'),
];

const forgotPasswordValidator = [body('email').isEmail().normalizeEmail()];

const resetPasswordValidator = [
  param('token').isString().isLength({ min: 20, max: 200 }),
  strongPasswordRules,
];

const verifyEmailValidator = [
  param('token').isString().isLength({ min: 20, max: 200 }),
];

module.exports = {
  deleteAccountValidator,
  forgotPasswordValidator,
  loginValidator,
  registerDoctorValidator,
  registerPatientValidator,
  resetPasswordValidator,
  verifyEmailValidator,
};

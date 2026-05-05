const express = require('express');

const authController = require('../controllers/authController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const authRateLimiter = require('../middlewares/authRateLimiter');
const {
  doubleCsrfProtection,
  issueCsrfToken,
} = require('../middlewares/csrfProtection');
const uploadDoctorDocuments = require('../middlewares/uploadDoctorDocuments');
const validateRequest = require('../middlewares/validateRequest');
const {
  changePasswordValidator,
  deleteAccountValidator,
  forgotPasswordValidator,
  loginValidator,
  registerDoctorValidator,
  registerPatientValidator,
  resetPasswordValidator,
  verifyEmailValidator,
} = require('../utils/authValidators');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/csrf-token', issueCsrfToken);

router.post(
  '/register/patient',
  authRateLimiter,
  doubleCsrfProtection,
  uploadDoctorDocuments.single('cinDocument'),
  registerPatientValidator,
  validateRequest,
  asyncHandler(authController.registerPatient)
);

router.post(
  '/register/doctor',
  authRateLimiter,
  doubleCsrfProtection,
  uploadDoctorDocuments.fields([
    { name: 'documents', maxCount: 5 },
    { name: 'cinDocument', maxCount: 1 },
  ]),
  registerDoctorValidator,
  validateRequest,
  asyncHandler(authController.registerDoctor)
);

router.post(
  '/login',
  authRateLimiter,
  doubleCsrfProtection,
  loginValidator,
  validateRequest,
  asyncHandler(authController.login)
);

router.post(
  '/logout',
  authRateLimiter,
  doubleCsrfProtection,
  asyncHandler(authController.logout)
);

router.delete(
  '/me',
  authRateLimiter,
  doubleCsrfProtection,
  authenticate,
  authorize(['PATIENT', 'DOCTOR', 'ADMIN']),
  deleteAccountValidator,
  validateRequest,
  asyncHandler(authController.deleteAccount)
);

router.get(
  '/me',
  authenticate,
  authorize(['PATIENT', 'DOCTOR', 'ADMIN']),
  asyncHandler(authController.getCurrentUser)
);

router.post(
  '/refresh-token',
  authRateLimiter,
  doubleCsrfProtection,
  asyncHandler(authController.refreshToken)
);

router.get(
  '/verify-email/:token',
  verifyEmailValidator,
  validateRequest,
  asyncHandler(authController.verifyEmail)
);

router.post(
  '/forgot-password',
  authRateLimiter,
  doubleCsrfProtection,
  forgotPasswordValidator,
  validateRequest,
  asyncHandler(authController.forgotPassword)
);

router.post(
  '/reset-password/:token',
  authRateLimiter,
  doubleCsrfProtection,
  resetPasswordValidator,
  validateRequest,
  asyncHandler(authController.resetPassword)
);

router.post(
  '/change-password',
  authenticate,
  doubleCsrfProtection,
  changePasswordValidator,
  validateRequest,
  asyncHandler(authController.changePassword)
);

module.exports = router;

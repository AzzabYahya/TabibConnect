const express = require('express');
const { body, query, param } = require('express-validator');

const dashboardController = require('../controllers/dashboardController');
const adminFileController = require('../controllers/adminFileController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const asyncHandler = require('../utils/asyncHandler');
const validateRequest = require('../middlewares/validateRequest');

const router = express.Router();

router.use(authenticate);
router.use(authorize(['ADMIN']));

router.get(
  '/users',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('role').optional().isIn(['ALL', 'ADMIN', 'DOCTOR', 'PATIENT']),
  query('search').optional().isString(),
  query('city').optional().isString(),
  query('status').optional().isIn(['ALL', 'ACTIVE', 'INACTIVE']),
  query('sortBy').optional().isIn(['createdAt', 'email', 'role', 'status', 'name']),
  query('sortDir').optional().isIn(['asc', 'desc']),
  validateRequest,
  asyncHandler(dashboardController.getAdminUsers)
);

router.get(
  '/logs',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('type').optional().isIn(['ALL', 'RDV', 'NOTIFICATION', 'AUTH', 'PAIEMENT']),
  validateRequest,
  asyncHandler(dashboardController.getAdminLogs)
);

router.get('/metrics', asyncHandler(dashboardController.getAdminMetrics));

router.get(
  '/doctors',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn(['ALL', 'PENDING', 'VERIFIED']),
  query('search').optional().isString(),
  query('sortBy').optional().isIn(['createdAt', 'name', 'email']),
  query('sortDir').optional().isIn(['asc', 'desc']),
  validateRequest,
  asyncHandler(dashboardController.getAdminDoctors)
);

router.put(
  '/doctors/:doctorId/profile',
  param('doctorId').isString().isLength({ min: 10, max: 40 }),
  body('nomComplet').optional().isString().isLength({ min: 2, max: 120 }),
  body('specialite').optional().isString().isLength({ min: 2, max: 120 }),
  body('diplomes').optional().custom((value) => Array.isArray(value) || typeof value === 'string'),
  body('languesParlees').optional().custom((value) => Array.isArray(value) || typeof value === 'string'),
  body('tarifConsultation').optional().isFloat({ gt: 0, max: 10000 }),
  body('experience').optional().isInt({ min: 0, max: 80 }),
  body('accepteAssurance').optional().isBoolean(),
  body('assurancesAcceptees').optional().custom((value) => Array.isArray(value) || typeof value === 'string'),
  body('bio').optional().isString().isLength({ max: 5000 }),
  validateRequest,
  asyncHandler(dashboardController.updateDoctorProfileByAdmin)
);

router.post(
  '/doctors/:doctorId/verify',
  param('doctorId').isString().isLength({ min: 10, max: 40 }),
  validateRequest,
  asyncHandler(dashboardController.verifyDoctor)
);

router.post(
  '/doctors/:doctorId/reject',
  param('doctorId').isString().isLength({ min: 10, max: 40 }),
  body('reason').isString().isLength({ min: 3, max: 500 }),
  validateRequest,
  asyncHandler(dashboardController.rejectDoctor)
);

router.post(
  '/patients/:patientId/profile',
  param('patientId').isString().isLength({ min: 10, max: 40 }),
  body('adresse').optional().isString().trim(),
  body('ville').optional().isString().trim(),
  body('groupeSanguin').optional().isString().trim(),
  body('antecedents').optional().isString().trim(),
  validateRequest,
  asyncHandler(dashboardController.updatePatientProfileByAdmin)
);

router.get(
  '/reviews',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn(['PENDING', 'VERIFIED']),
  query('search').optional().isString(),
  validateRequest,
  asyncHandler(dashboardController.getAdminReviews)
);

router.post(
  '/reviews/:reviewId/verify',
  param('reviewId').isString().isLength({ min: 10, max: 40 }),
  validateRequest,
  asyncHandler(dashboardController.verifyReview)
);

router.post(
  '/reviews/:reviewId/reject',
  param('reviewId').isString().isLength({ min: 10, max: 40 }),
  body('reason').isString().isLength({ min: 3, max: 500 }),
  validateRequest,
  asyncHandler(dashboardController.rejectReview)
);

router.get(
  '/notifications',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('isRead').optional().isIn(['ALL', 'READ', 'UNREAD']),
  query('search').optional().isString(),
  validateRequest,
  asyncHandler(dashboardController.getAdminNotifications)
);

router.get(
  '/doctors/:doctorId/documents/:documentId',
  param('doctorId').isString().isLength({ min: 10, max: 40 }),
  param('documentId').isString().isLength({ min: 10, max: 40 }),
  validateRequest,
  asyncHandler(adminFileController.getDoctorDocument)
);

router.get(
  '/patients/:patientId/documents/:documentId',
  param('patientId').isString().isLength({ min: 10, max: 40 }),
  param('documentId').isString().isLength({ min: 10, max: 40 }),
  validateRequest,
  asyncHandler(adminFileController.getPatientDocument)
);

router.get(
  '/users/:userId/cin',
  param('userId').isString().isLength({ min: 10, max: 40 }),
  validateRequest,
  asyncHandler(adminFileController.getUserCinDocument)
);


router.post(
  '/notifications/mark-read',
  body('ids').isArray({ min: 1 }),
  body('ids.*').isString().isLength({ min: 10, max: 40 }),
  validateRequest,
  asyncHandler(dashboardController.markNotificationsRead)
);

router.post(
  '/users/:userId/disable',
  param('userId').isString().isLength({ min: 10, max: 40 }),
  validateRequest,
  asyncHandler(dashboardController.disableUser)
);

router.delete(
  '/users/:userId',
  param('userId').isString().isLength({ min: 10, max: 40 }),
  validateRequest,
  asyncHandler(dashboardController.deleteUser)
);

router.get(
  '/appointments',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn(['ALL', 'EN_ATTENTE', 'CONFIRME', 'COMPLETE', 'ANNULE', 'NO_SHOW']),
  query('search').optional().isString(),
  validateRequest,
  asyncHandler(dashboardController.getAdminAppointments)
);

router.get(
  '/patient-change-requests',

  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validateRequest,
  asyncHandler(dashboardController.listPendingPatientChangeRequests)
);

router.post(
  '/patient-change-requests/:requestId/approve',
  param('requestId').isString().isLength({ min: 10, max: 40 }),
  body('reviewNote').optional().isString().isLength({ max: 1000 }),
  validateRequest,
  asyncHandler(dashboardController.approvePatientChangeRequest)
);

router.post(
  '/patient-change-requests/:requestId/reject',
  param('requestId').isString().isLength({ min: 10, max: 40 }),
  body('reviewNote').optional().isString().isLength({ max: 1000 }),
  validateRequest,
  asyncHandler(dashboardController.rejectPatientChangeRequest)
);

const uploadDoctorDocuments = require('../middlewares/uploadDoctorDocuments');

router.post(
  '/users/:userId/profile-photo',
  param('userId').isString().isLength({ min: 10, max: 40 }),
  uploadDoctorDocuments.single('profilePhoto'),
  validateRequest,
  asyncHandler(dashboardController.updateProfilePhotoByAdmin)
);

module.exports = router;

const express = require('express');
const { body, query, param } = require('express-validator');

const dashboardController = require('../controllers/dashboardController');
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
  validateRequest,
  asyncHandler(dashboardController.getAdminDoctors)
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

module.exports = router;

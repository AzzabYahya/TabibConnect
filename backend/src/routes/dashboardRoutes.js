const express = require('express');
const { param } = require('express-validator');
const { body } = require('express-validator');

const dashboardController = require('../controllers/dashboardController');
const uploadDoctorDocuments = require('../middlewares/uploadDoctorDocuments');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const asyncHandler = require('../utils/asyncHandler');
const validateRequest = require('../middlewares/validateRequest');

const router = express.Router();

router.use(authenticate);

router.get('/patient', authorize(['PATIENT']), asyncHandler(dashboardController.getPatientDashboard));
router.get('/patient/history', authorize(['PATIENT']), asyncHandler(dashboardController.getPatientHistory));
router.get('/patient/recurring-doctors', authorize(['PATIENT']), asyncHandler(dashboardController.getPatientRecurringDoctors));
router.get('/patient/notifications', authorize(['PATIENT']), asyncHandler(dashboardController.getPatientNotifications));
router.post('/patient/notifications/mark-read', authorize(['PATIENT']), asyncHandler(dashboardController.markPatientNotificationsRead));
router.post('/patient/change-requests', authorize(['PATIENT']), asyncHandler(dashboardController.submitPatientChangeRequest));
router.get('/patient/change-requests', authorize(['PATIENT']), asyncHandler(dashboardController.listMyPatientChangeRequests));
router.get('/doctor', authorize(['DOCTOR']), asyncHandler(dashboardController.getDoctorDashboard));
router.get('/admin', authorize(['ADMIN']), asyncHandler(dashboardController.getAdminDashboard));
router.post(
	'/admin/doctors/:doctorId/verify',
	authorize(['ADMIN']),
	param('doctorId').isString().isLength({ min: 10, max: 40 }),
	validateRequest,
	asyncHandler(dashboardController.verifyDoctor)
);
router.post(
	'/admin/reviews/:reviewId/verify',
	authorize(['ADMIN']),
	param('reviewId').isString().isLength({ min: 10, max: 40 }),
	validateRequest,
	asyncHandler(dashboardController.verifyReview)
);
router.post(
	'/admin/accounts/:userId/notify',
	authorize(['ADMIN']),
	param('userId').isString().isLength({ min: 10, max: 40 }),
	body('channel').isString().isIn(['email', 'sms', 'both']),
	body('subject').optional().isString().isLength({ max: 120 }),
	body('message').isString().isLength({ min: 3, max: 1000 }),
	validateRequest,
	asyncHandler(dashboardController.notifyAccount)
);
router.post(
	'/admin/accounts',
	authorize(['ADMIN']),
	uploadDoctorDocuments.single('cinDocument'),
	body('role').isIn(['ADMIN', 'DOCTOR', 'PATIENT']),
	body('email').isEmail(),
	body('phone').isString().isLength({ min: 6, max: 30 }),
	body('password').isString().isLength({ min: 8, max: 128 }),
	body('isVerified').optional().isBoolean(),
	body('cin').optional().isString().isLength({ min: 4, max: 40 }),
	body('dateOfNaissance').optional().isISO8601(),
	body('sexe').optional().isIn(['HOMME', 'FEMME']),
	body('adresse').optional().isString().isLength({ min: 2, max: 255 }),
	body('ville').optional().isString().isLength({ min: 2, max: 120 }),
	body('inpe').optional().isString().isLength({ min: 4, max: 40 }),
	body('specialite').optional().isString().isLength({ min: 2, max: 120 }),
	body('tarifConsultation').optional().isFloat({ gt: 0 }),
	body('experience').optional().isInt({ min: 0, max: 80 }),
	validateRequest,
	asyncHandler(dashboardController.createAccountByAdmin)
);
router.get(
	'/admin/accounts/:userId',
	authorize(['ADMIN']),
	param('userId').isString().isLength({ min: 10, max: 40 }),
	validateRequest,
	asyncHandler(dashboardController.getAdminAccountDetails)
);

router.post(
	'/admin/doctor-change-requests/:requestId/approve',
	authorize(['ADMIN']),
	param('requestId').isString().isLength({ min: 10, max: 40 }),
	body('reviewNote').optional().isString().isLength({ max: 1000 }),
	validateRequest,
	asyncHandler(dashboardController.approveDoctorChangeRequest)
);

router.post(
	'/admin/doctor-change-requests/:requestId/reject',
	authorize(['ADMIN']),
	param('requestId').isString().isLength({ min: 10, max: 40 }),
	body('reviewNote').optional().isString().isLength({ max: 1000 }),
	validateRequest,
	asyncHandler(dashboardController.rejectDoctorChangeRequest)
);

module.exports = router;
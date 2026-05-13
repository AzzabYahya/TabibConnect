const express = require('express');

const doctorController = require('../controllers/doctorController');
const doctorFileController = require('../controllers/doctorFileController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const uploadDoctorDocuments = require('../middlewares/uploadDoctorDocuments');
const asyncHandler = require('../utils/asyncHandler');
const {
  doctorCreateAvailabilityValidator,
  doctorDeleteAvailabilityValidator,
  doctorAvailabilityValidator,
  doctorIdValidator,
  doctorListValidator,
  doctorReviewsValidator,
  doctorSearchValidator,
  doctorUpdateAvailabilityValidator,
  doctorChangeRequestIdValidator,
  doctorSubmitChangeRequestValidator,
  doctorUpdateProfileValidator,
} = require('../utils/doctorValidators');
const validateRequest = require('../middlewares/validateRequest');
const generalRateLimiter = require('../middlewares/generalRateLimiter');

const router = express.Router();

router.use(generalRateLimiter);

router.get('/', doctorListValidator, validateRequest, asyncHandler(doctorController.listDoctors));

router.get(
  '/search',
  doctorSearchValidator,
  validateRequest,
  asyncHandler(doctorController.searchDoctors)
);

router.put(
  '/profile',
  authenticate,
  authorize(['DOCTOR']),
  doctorUpdateProfileValidator,
  validateRequest,
  asyncHandler(doctorController.updateDoctorProfile)
);

router.post(
  '/me/profile-photo',
  authenticate,
  authorize(['DOCTOR']),
  uploadDoctorDocuments.single('profilePhoto'),
  asyncHandler(doctorController.uploadDoctorProfilePhoto)
);

router.get(
  '/me/profile-management',
  authenticate,
  authorize(['DOCTOR']),
  asyncHandler(doctorController.getDoctorProfileManagement)
);

router.get(
  '/me/agenda',
  authenticate,
  authorize(['DOCTOR']),
  asyncHandler(doctorController.getDoctorAgenda)
);

router.get(
  '/me/patients',
  authenticate,
  authorize(['DOCTOR']),
  asyncHandler(doctorController.listDoctorPatients)
);

router.get(
  '/me/reviews',
  authenticate,
  authorize(['DOCTOR']),
  asyncHandler(doctorController.getDoctorReceivedReviews)
);

router.get(
  '/me/patients/:patientId/history',
  authenticate,
  authorize(['DOCTOR']),
  asyncHandler(doctorController.getDoctorPatientHistory)
);

router.get(
  '/me/patients/:patientId/profile',
  authenticate,
  authorize(['DOCTOR']),
  asyncHandler(doctorController.getDoctorPatientProfile)
);


router.get(
  '/me/stats',
  authenticate,
  authorize(['DOCTOR']),
  asyncHandler(doctorController.getDoctorStats)
);

router.post(
  '/me/availabilities',
  authenticate,
  authorize(['DOCTOR']),
  doctorCreateAvailabilityValidator,
  validateRequest,
  asyncHandler(doctorController.createDoctorAvailability)
);

router.put(
  '/me/availabilities/:availabilityId',
  authenticate,
  authorize(['DOCTOR']),
  doctorUpdateAvailabilityValidator,
  validateRequest,
  asyncHandler(doctorController.updateDoctorAvailability)
);

router.delete(
  '/me/availabilities/:availabilityId',
  authenticate,
  authorize(['DOCTOR']),
  doctorDeleteAvailabilityValidator,
  validateRequest,
  asyncHandler(doctorController.deleteDoctorAvailability)
);

router.get(
  '/me/change-requests',
  authenticate,
  authorize(['DOCTOR']),
  asyncHandler(doctorController.listDoctorChangeRequests)
);

router.post(
  '/me/change-requests',
  authenticate,
  authorize(['DOCTOR']),
  doctorSubmitChangeRequestValidator,
  validateRequest,
  asyncHandler(doctorController.submitDoctorChangeRequest)
);

router.put(
  '/me/change-requests/:requestId',
  authenticate,
  authorize(['DOCTOR']),
  doctorChangeRequestIdValidator,
  doctorSubmitChangeRequestValidator,
  validateRequest,
  asyncHandler(doctorController.updateDoctorChangeRequest)
);

router.delete(
  '/me/change-requests/:requestId',
  authenticate,
  authorize(['DOCTOR']),
  doctorChangeRequestIdValidator,
  validateRequest,
  asyncHandler(doctorController.cancelDoctorChangeRequest)
);

router.get(
  '/:id/availabilities',
  doctorAvailabilityValidator,
  validateRequest,
  asyncHandler(doctorController.getDoctorAvailabilities)
);

router.get(
  '/:id/reviews',
  doctorReviewsValidator,
  validateRequest,
  asyncHandler(doctorController.getDoctorReviews)
);

router.get(
  '/:id/profile-photo',
  doctorIdValidator,
  validateRequest,
  asyncHandler(doctorFileController.getDoctorProfilePhoto)
);

router.get(
  '/:id',
  doctorIdValidator,
  validateRequest,
  asyncHandler(doctorController.getDoctorProfile)
);

module.exports = router;

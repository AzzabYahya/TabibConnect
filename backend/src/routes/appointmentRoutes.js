const express = require('express');

const appointmentController = require('../controllers/appointmentController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const asyncHandler = require('../utils/asyncHandler');
const validateRequest = require('../middlewares/validateRequest');
const generalRateLimiter = require('../middlewares/generalRateLimiter');
const {
  appointmentIdValidator,
  cancelAppointmentValidator,
  createAppointmentValidator,
  createDoctorPatientNoteValidator,
  createReviewValidator,
  rescheduleAppointmentValidator,
} = require('../utils/appointmentValidators');

const router = express.Router();

router.use(authenticate);
router.use(generalRateLimiter);

router.post(
  '/',
  authorize(['PATIENT']),
  createAppointmentValidator,
  validateRequest,
  asyncHandler(appointmentController.createAppointment)
);

router.post(
  '/:id/review',
  authorize(['PATIENT']),
  createReviewValidator,
  validateRequest,
  asyncHandler(appointmentController.createReview)
);

router.post(
  '/:id/patient-note',
  authorize(['DOCTOR']),
  createDoctorPatientNoteValidator,
  validateRequest,
  asyncHandler(appointmentController.createDoctorPatientNote)
);

router.get(
  '/my',
  authorize(['PATIENT', 'DOCTOR']),
  asyncHandler(appointmentController.getMyAppointments)
);

router.get(
  '/upcoming',
  authorize(['PATIENT', 'DOCTOR']),
  asyncHandler(appointmentController.getUpcomingAppointments)
);

router.get(
  '/:id',
  appointmentIdValidator,
  validateRequest,
  asyncHandler(appointmentController.getAppointmentById)
);

router.put(
  '/:id/confirm',
  authorize(['DOCTOR']),
  appointmentIdValidator,
  validateRequest,
  asyncHandler(appointmentController.confirmAppointment)
);

router.put(
  '/:id/cancel',
  authorize(['PATIENT', 'DOCTOR']),
  cancelAppointmentValidator,
  validateRequest,
  asyncHandler(appointmentController.cancelAppointment)
);

router.put(
  '/:id/complete',
  authorize(['DOCTOR']),
  appointmentIdValidator,
  validateRequest,
  asyncHandler(appointmentController.completeAppointment)
);

router.put(
  '/:id/reschedule',
  authorize(['PATIENT', 'DOCTOR']),
  rescheduleAppointmentValidator,
  validateRequest,
  asyncHandler(appointmentController.rescheduleAppointment)
);

module.exports = router;

const express = require('express');
const { param } = require('express-validator');

const patientController = require('../controllers/patientController');
const patientFileController = require('../controllers/patientFileController');
const uploadDoctorDocuments = require('../middlewares/uploadDoctorDocuments');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const asyncHandler = require('../utils/asyncHandler');
const validateRequest = require('../middlewares/validateRequest');

const router = express.Router();

router.post('/me/profile-photo', authenticate, authorize(['PATIENT']), uploadDoctorDocuments.single('profilePhoto'), asyncHandler(patientController.uploadPatientProfilePhoto));

router.get('/:id/profile-photo', param('id').isString().isLength({ min: 10, max: 40 }), validateRequest, asyncHandler(patientFileController.getPatientProfilePhoto));

module.exports = router;

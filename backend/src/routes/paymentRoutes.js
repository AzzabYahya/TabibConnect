const express = require('express');
const { body } = require('express-validator');

const paymentController = require('../controllers/paymentController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const asyncHandler = require('../utils/asyncHandler');
const validateRequest = require('../middlewares/validateRequest');

const router = express.Router();

router.use(authenticate);

router.post(
  '/confirm-card-session',
  authorize(['PATIENT']),
  body('sessionId').isString().isLength({ min: 10, max: 255 }),
  body('appointmentId').optional().isString().isLength({ min: 10, max: 40 }),
  validateRequest,
  asyncHandler(paymentController.confirmCardPaymentSession)
);

module.exports = router;


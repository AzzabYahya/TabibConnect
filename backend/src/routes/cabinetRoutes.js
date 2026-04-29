const express = require('express');

const cabinetController = require('../controllers/cabinetController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const asyncHandler = require('../utils/asyncHandler');
const {
  cabinetIdValidator,
  createCabinetValidator,
  nearbyCabinetsValidator,
} = require('../utils/cabinetValidators');
const validateRequest = require('../middlewares/validateRequest');

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorize(['DOCTOR']),
  createCabinetValidator,
  validateRequest,
  asyncHandler(cabinetController.createCabinet)
);

router.get(
  '/nearby',
  nearbyCabinetsValidator,
  validateRequest,
  asyncHandler(cabinetController.getNearbyCabinets)
);

router.get(
  '/:id',
  cabinetIdValidator,
  validateRequest,
  asyncHandler(cabinetController.getCabinetDetails)
);

module.exports = router;

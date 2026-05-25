const express = require('express');

const ordonnanceController = require('../controllers/ordonnanceController');
const asyncHandler = require('../utils/asyncHandler');
const generalRateLimiter = require('../middlewares/generalRateLimiter');

const router = express.Router();

router.use(generalRateLimiter);

router.get('/verify/:qrCode', asyncHandler(ordonnanceController.verifyOrdonnance));

module.exports = router;

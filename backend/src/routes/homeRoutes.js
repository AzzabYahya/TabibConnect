const express = require('express');

const homeController = require('../controllers/homeController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/summary', asyncHandler(homeController.getHomeSummary));

module.exports = router;

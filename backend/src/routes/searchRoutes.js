const express = require('express');

const searchController = require('../controllers/searchController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/filters', asyncHandler(searchController.getFilters));
router.get('/suggestions', asyncHandler(searchController.getSuggestions));

module.exports = router;

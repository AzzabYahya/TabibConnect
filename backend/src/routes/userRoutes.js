const express = require('express');
const { param } = require('express-validator');

const userController = require('../controllers/userController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const asyncHandler = require('../utils/asyncHandler');
const validateRequest = require('../middlewares/validateRequest');

const router = express.Router();

router.use(authenticate);
router.use(authorize(['ADMIN']));

router.get(
  '/:userId/profile',
  param('userId').isString().isLength({ min: 10, max: 40 }),
  validateRequest,
  asyncHandler(userController.getUserProfile)
);

module.exports = router;


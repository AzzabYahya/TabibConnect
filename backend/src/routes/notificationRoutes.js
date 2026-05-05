const express = require('express');
const { body, query } = require('express-validator');

const authenticate = require('../middlewares/authenticate');
const asyncHandler = require('../utils/asyncHandler');
const prisma = require('../config/prisma');
const validateRequest = require('../middlewares/validateRequest');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  validateRequest,
  asyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const where = { userId: req.user.id };
    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);
    res.status(200).json({
      status: 'success',
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      },
    });
  })
);

router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    res.status(200).json({ status: 'success', data: { count } });
  })
);

router.post(
  '/mark-read',
  body('ids').optional().isArray({ min: 1 }),
  body('ids.*').optional().isString().isLength({ min: 10, max: 40 }),
  validateRequest,
  asyncHandler(async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : null;
    const where = ids
      ? { userId: req.user.id, id: { in: ids }, isRead: false }
      : { userId: req.user.id, isRead: false };
    const result = await prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });
    res.status(200).json({ status: 'success', data: { updated: result.count } });
  })
);

module.exports = router;

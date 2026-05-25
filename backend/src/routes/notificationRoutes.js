const express = require('express');
const { body, query } = require('express-validator');

const authenticate = require('../middlewares/authenticate');
const asyncHandler = require('../utils/asyncHandler');
const prisma = require('../config/prisma');
const validateRequest = require('../middlewares/validateRequest');
const { mapNotification } = require('../utils/notificationMapper');

const router = express.Router();

router.use(authenticate);

const categoryTypeMap = {
  RENDEZ_VOUS: ['RAPPEL_RDV', 'RDV_CONFIRME', 'RDV_ANNULE'],
  PAIEMENT: ['PAIEMENT_RECU'],
};

router.get(
  '/',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('type').optional().isIn(['RAPPEL_RDV', 'RDV_CONFIRME', 'RDV_ANNULE', 'PAIEMENT_RECU', 'SYSTEME']),
  query('category').optional().isIn(['RENDEZ_VOUS', 'PAIEMENT', 'ORDONNANCE', 'SYSTEME']),
  validateRequest,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const userId = req.user.id;
    const type = req.query.type ? String(req.query.type) : null;
    const category = req.query.category ? String(req.query.category) : null;

    const where = { userId };

    if (type) {
      where.type = type;
    } else if (category === 'ORDONNANCE') {
      where.type = 'SYSTEME';
      where.metadata = { path: ['category'], equals: 'ORDONNANCE' };
    } else if (category === 'SYSTEME') {
      where.AND = [
        { type: 'SYSTEME' },
        {
          OR: [
            { metadata: { equals: null } },
            { NOT: { metadata: { path: ['category'], equals: 'ORDONNANCE' } } },
          ],
        },
      ];
    } else if (category && categoryTypeMap[category]) {
      where.type = { in: categoryTypeMap[category] };
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    const items = notifications.map((notification) =>
      mapNotification(notification, { userRole: req.user.role })
    );

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

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
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const userId = req.user.id;
    
    console.log(`[NotificationRoute] Fetching for userId: ${userId}, page: ${page}`);

    const where = { userId };
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    console.log(`[NotificationRoute] Found ${notifications.length} notifications (total: ${total})`);

    // Standardize to mapped format used by dashboards
    const notificationTitles = {
      RAPPEL_RDV: 'Rappel de rendez-vous',
      RDV_CONFIRME: 'Rendez-vous confirme',
      RDV_ANNULE: 'Rendez-vous annule',
      PAIEMENT_RECU: 'Paiement recu',
      SYSTEME: 'Information systeme',
    };

    const buildRelativeLabel = (dateValue) => {
      const date = new Date(dateValue);
      const diffInMinutes = Math.round((Date.now() - date.getTime()) / (1000 * 60));
      if (diffInMinutes < 1) return 'À l\'instant';
      if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
      const diffInHours = Math.round(diffInMinutes / 60);
      if (diffInHours < 24) return `Il y a ${diffInHours} h`;
      return date.toLocaleDateString('fr-MA', { day: '2-digit', month: 'short' });
    };

    const items = notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: notificationTitles[n.type] || 'Notification',
      body: n.message,
      time: buildRelativeLabel(n.createdAt),
      createdAt: n.createdAt,
      isRead: n.isRead,
    }));

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

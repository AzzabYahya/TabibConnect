const prisma = require('../config/prisma');
const { emitToUser } = require('../config/socket');

const createNotification = async ({ userId, type, message, metadata }) => {
  if (!userId) {
    return null;
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      message,
      isRead: false,
    },
  });

  emitToUser(userId, 'notification:new', {
    ...notification,
    metadata: metadata || null,
  });

  return notification;
};

module.exports = {
  createNotification,
};

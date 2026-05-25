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
      metadata: metadata || undefined,
      isRead: false,
    },
  });

  emitToUser(userId, 'notification:new', notification);

  return notification;
};

module.exports = {
  createNotification,
};

const prisma = require('../config/prisma');

const logAudit = async ({ req, action, targetId, payload }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req?.user?.id || null,
        action,
        targetId: String(targetId || ''),
        payload: payload || null,
        ipAddress: req?.ip || null,
        userAgent: req?.get('User-Agent') || null,
      },
    });
  } catch (error) {
    // We don't want audit logging to break the main flow, 
    // but we should log the failure in development.
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to create audit log:', error);
    }
  }
};

module.exports = {
  logAudit,
};

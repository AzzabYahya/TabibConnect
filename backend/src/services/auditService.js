const prisma = require('../config/prisma');

/**
 * Logs an action to the AuditLog table.
 * @param {Object} params
 * @param {string} params.userId - The ID of the user performing the action
 * @param {string} params.action - Short description of the action (e.g., "LOGIN", "RDV_CANCEL")
 * @param {string} params.resource - The affected resource (e.g., "User:123", "Appointment:456")
 * @param {Object} [params.payload] - Optional additional data
 * @param {Object} [params.req] - Express request object to extract IP and User-Agent
 */
const logAction = async ({ userId, action, resource, payload, req }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        payload: payload || {},
        ip: req?.ip || null,
        userAgent: req?.headers['user-agent'] || null,
      },
    });
  } catch (error) {
    // Audit logging should not break the main flow, so we just log the failure.
    console.error('Failed to create audit log:', error);
  }
};

module.exports = {
  logAction,
};

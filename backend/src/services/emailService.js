const nodemailer = require('nodemailer');

const env = require('../config/env');
const {
  getAppointmentCreatedTemplate,
  getAppointmentCancellationTemplate,
  getAppointmentConfirmationTemplate,
  getAppointmentCompletedTemplate,
  getAppointmentNoShowTemplate,
  getAppointmentRescheduledTemplate,
  getAppointmentReminderTemplate,
  getPasswordResetEmailTemplate,
  getVerificationEmailTemplate,
} = require('../utils/emailTemplates');

let transporterPromise;

const getTransporter = async () => {
  if (transporterPromise) {
    return transporterPromise;
  }

  transporterPromise = (async () => {
    if (env.smtpHost && env.smtpPort) {
      return nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpSecure,
        auth:
          env.smtpUser && env.smtpPass
            ? {
                user: env.smtpUser,
                pass: env.smtpPass,
              }
            : undefined,
      });
    }

    const testAccount = await nodemailer.createTestAccount();

    return nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  })();

  return transporterPromise;
};

const sendMail = async ({ to, subject, html }) => {
  if (!to) {
    return { skipped: true, reason: 'Missing recipient email' };
  }

  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl && env.nodeEnv === 'development') {
    // For local development without SMTP credentials.
    console.log(`Email preview available at: ${previewUrl}`);
  }

  return info;
};

const sendVerificationEmail = async ({ email, token }) => {
  const verificationUrl = `${env.appBaseUrl}/api/auth/verify-email/${token}`;

  return sendMail({
    to: email,
    subject: 'TabibConnect - Verify your email',
    html: getVerificationEmailTemplate({ verificationUrl }),
  });
};

const sendResetPasswordEmail = async ({ email, token }) => {
  const resetUrl = `${env.frontendUrl}/reset-password/${token}`;

  return sendMail({
    to: email,
    subject: 'TabibConnect - Reset your password',
    html: getPasswordResetEmailTemplate({
      resetToken: token,
      resetUrl,
      expiresInMinutes: env.resetPasswordTokenExpiresMinutes,
    }),
  });
};

const sendAppointmentConfirmationEmail = async ({ to, appointment, role }) => {
  return sendMail({
    to,
    subject: 'TabibConnect - Confirmation de rendez-vous',
    html: getAppointmentConfirmationTemplate({ appointment, role }),
  });
};

const sendAppointmentCreatedEmail = async ({ to, appointment, role }) => {
  return sendMail({
    to,
    subject: 'TabibConnect - Demande de rendez-vous recue',
    html: getAppointmentCreatedTemplate({ appointment, role }),
  });
};

const sendAppointmentCancellationEmail = async ({
  to,
  appointment,
  cancelledByRole,
  freeCancellation,
}) => {
  return sendMail({
    to,
    subject: 'TabibConnect - Annulation de rendez-vous',
    html: getAppointmentCancellationTemplate({
      appointment,
      cancelledByRole,
      freeCancellation,
    }),
  });
};

const sendAppointmentReminderEmail = async ({ to, appointment, role }) => {
  return sendMail({
    to,
    subject: 'TabibConnect - Rappel rendez-vous (24h)',
    html: getAppointmentReminderTemplate({ appointment, role }),
  });
};

const sendAppointmentCompletedEmail = async ({ to, appointment, role }) => {
  return sendMail({
    to,
    subject: 'TabibConnect - Rendez-vous termine',
    html: getAppointmentCompletedTemplate({ appointment, role }),
  });
};

const sendAppointmentNoShowEmail = async ({ to, appointment, role }) => {
  return sendMail({
    to,
    subject: 'TabibConnect - Rendez-vous marque NO_SHOW',
    html: getAppointmentNoShowTemplate({ appointment, role }),
  });
};

const sendAppointmentRescheduledEmail = async ({ to, appointment, role, previousDateHeure, rescheduledByRole, reason }) => {
  return sendMail({
    to,
    subject: 'TabibConnect - Rendez-vous reprogramme',
    html: getAppointmentRescheduledTemplate({
      appointment,
      previousDateHeure,
      role,
      rescheduledByRole,
      reason,
    }),
  });
};

module.exports = {
  sendMail,
  sendAppointmentCancellationEmail,
  sendAppointmentCompletedEmail,
  sendAppointmentCreatedEmail,
  sendAppointmentConfirmationEmail,
  sendAppointmentNoShowEmail,
  sendAppointmentRescheduledEmail,
  sendAppointmentReminderEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
};

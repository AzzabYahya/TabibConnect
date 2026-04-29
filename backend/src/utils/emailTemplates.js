const getVerificationEmailTemplate = ({ verificationUrl }) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #0f766e;">Verify your TabibConnect account</h2>
      <p>Welcome to TabibConnect.</p>
      <p>Please verify your email to activate your account by clicking the button below:</p>
      <p style="margin: 24px 0;">
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 18px; background: #0f766e; color: #ffffff; text-decoration: none; border-radius: 8px;">
          Verify email
        </a>
      </p>
      <p>If the button does not work, use this link:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">If you did not create this account, ignore this email.</p>
    </div>
  `;
};

const getPasswordResetEmailTemplate = ({ resetToken, resetUrl, expiresInMinutes }) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #7c2d12;">Reset your TabibConnect password</h2>
      <p>We received a request to reset your password.</p>
      <p>This request expires in ${expiresInMinutes} minutes.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 18px; background: #7c2d12; color: #ffffff; text-decoration: none; border-radius: 8px;">
          Reset password
        </a>
      </p>
      <p>Reset token:</p>
      <pre style="background: #f3f4f6; padding: 12px; border-radius: 8px;">${resetToken}</pre>
      <p>If the button does not work, use this link:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">If you did not request this change, ignore this email.</p>
    </div>
  `;
};

const formatDate = (dateValue) => {
  return new Date(dateValue).toLocaleString('fr-MA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false,
  });
};

const getAppointmentConfirmationTemplate = ({ appointment, role }) => {
  const dateLabel = formatDate(appointment.dateHeure);
  const headline =
    role === 'doctor'
      ? 'Rendez-vous confirme sur TabibConnect'
      : 'Votre rendez-vous est confirme';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
      <h2 style="color: #166534;">${headline}</h2>
      <p>Date et heure: <strong>${dateLabel}</strong></p>
      <p>Type de consultation: <strong>${appointment.typeConsultation}</strong></p>
      <p>Motif: ${appointment.motif}</p>
      <p style="font-size: 12px; color: #6b7280;">Merci d'arriver quelques minutes avant l'heure prevue.</p>
    </div>
  `;
};

const getAppointmentCancellationTemplate = ({ appointment, cancelledByRole, freeCancellation }) => {
  const dateLabel = formatDate(appointment.dateHeure);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
      <h2 style="color: #991b1b;">Annulation de rendez-vous</h2>
      <p>Le rendez-vous du <strong>${dateLabel}</strong> a ete annule.</p>
      <p>Annule par: <strong>${cancelledByRole}</strong></p>
      <p>Motif: ${appointment.cancellationReason || 'Non renseigne'}</p>
      <p>Politique: <strong>${
        freeCancellation
          ? 'Annulation gratuite appliquee (>= 2h avant le rendez-vous).'
          : 'Annulation tardive (< 2h avant le rendez-vous).'
      }</strong></p>
    </div>
  `;
};

const getAppointmentReminderTemplate = ({ appointment, role }) => {
  const dateLabel = formatDate(appointment.dateHeure);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
      <h2 style="color: #1d4ed8;">Rappel rendez-vous (24h)</h2>
      <p>${
        role === 'doctor'
          ? 'Vous avez un rendez-vous prevu demain.'
          : 'Votre rendez-vous est prevu demain.'
      }</p>
      <p>Date et heure: <strong>${dateLabel}</strong></p>
      <p>Type: <strong>${appointment.typeConsultation}</strong></p>
      <p>Motif: ${appointment.motif}</p>
    </div>
  `;
};

const getAppointmentCreatedTemplate = ({ appointment, role }) => {
  const dateLabel = formatDate(appointment.dateHeure);
  const headline =
    role === 'doctor'
      ? 'Nouvelle demande de rendez-vous a confirmer'
      : 'Votre demande de rendez-vous est en attente de confirmation';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
      <h2 style="color: #0f766e;">${headline}</h2>
      <p>Date et heure demandees: <strong>${dateLabel}</strong></p>
      <p>Type: <strong>${appointment.typeConsultation}</strong></p>
      <p>Motif: ${appointment.motif}</p>
      <p>Statut actuel: <strong>${appointment.statut}</strong></p>
      <p style="font-size: 12px; color: #6b7280;">Un medecin confirmera ce rendez-vous tres bientot.</p>
    </div>
  `;
};

const getAppointmentCompletedTemplate = ({ appointment, role }) => {
  const dateLabel = formatDate(appointment.dateHeure);
  const headline =
    role === 'doctor'
      ? 'Rendez-vous termine sur TabibConnect'
      : 'Votre rendez-vous est termine';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
      <h2 style="color: #166534;">${headline}</h2>
      <p>Date et heure: <strong>${dateLabel}</strong></p>
      <p>Type: <strong>${appointment.typeConsultation}</strong></p>
      <p>Motif: ${appointment.motif}</p>
      <p style="font-size: 12px; color: #6b7280;">Merci d'avoir fait confiance a TabibConnect.</p>
    </div>
  `;
};

const getAppointmentNoShowTemplate = ({ appointment, role }) => {
  const dateLabel = formatDate(appointment.dateHeure);
  const headline =
    role === 'doctor'
      ? 'Rendez-vous marque NO_SHOW'
      : 'Rendez-vous marque NO_SHOW';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
      <h2 style="color: #92400e;">${headline}</h2>
      <p>Le rendez-vous du <strong>${dateLabel}</strong> a ete marque comme non honore.</p>
      <p>Motif: ${appointment.motif}</p>
      <p style="font-size: 12px; color: #6b7280;">Contactez-nous si cette information est incorrecte.</p>
    </div>
  `;
};

const getAppointmentRescheduledTemplate = ({ appointment, previousDateHeure, role, rescheduledByRole, reason }) => {
  const dateLabel = formatDate(appointment.dateHeure);
  const previousLabel = formatDate(previousDateHeure);
  const headline =
    role === 'doctor'
      ? 'Rendez-vous reprogramme'
      : 'Votre rendez-vous a ete reprogramme';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
      <h2 style="color: #1d4ed8;">${headline}</h2>
      <p>Ancienne date: <strong>${previousLabel}</strong></p>
      <p>Nouvelle date: <strong>${dateLabel}</strong></p>
      <p>Reprogramme par: <strong>${rescheduledByRole}</strong></p>
      <p>Motif: ${reason || 'Non renseigne'}</p>
      <p style="font-size: 12px; color: #6b7280;">Merci de verifier la nouvelle date.</p>
    </div>
  `;
};

module.exports = {
  getAppointmentCreatedTemplate,
  getAppointmentCancellationTemplate,
  getAppointmentConfirmationTemplate,
  getAppointmentCompletedTemplate,
  getAppointmentNoShowTemplate,
  getAppointmentRescheduledTemplate,
  getAppointmentReminderTemplate,
  getPasswordResetEmailTemplate,
  getVerificationEmailTemplate,
};

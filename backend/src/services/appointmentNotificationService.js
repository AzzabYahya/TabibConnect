const {
  sendAppointmentCancellationEmail,
  sendAppointmentCompletedEmail,
  sendAppointmentConfirmationEmail,
  sendAppointmentCreatedEmail,
  sendAppointmentNoShowEmail,
  sendAppointmentRescheduledEmail,
  sendAppointmentReminderEmail,
} = require('./emailService');
const { createNotification } = require('./notificationService');
const { sendSms } = require('./smsService');

const formatDateForMessage = (dateValue) => {
  return new Date(dateValue).toLocaleString('fr-MA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false,
  });
};

const getDoctorName = (appointment) => {
  return appointment.doctor?.nomComplet || appointment.doctor?.user?.email || 'votre medecin';
};

const getPatientName = (appointment) => {
  return appointment.patient?.user?.email || 'patient';
};

const sendAppointmentCreatedNotifications = async (appointment) => {
  const dateLabel = formatDateForMessage(appointment.dateHeure);

  await Promise.all([
    createNotification({
      userId: appointment.patient?.userId,
      type: 'SYSTEME',
      message: `Votre demande de rendez-vous du ${dateLabel} a ete enregistree.`,
      metadata: { appointmentId: appointment.id, category: 'RENDEZ_VOUS', event: 'CREATED' },
    }),
    createNotification({
      userId: appointment.doctor?.userId,
      type: 'SYSTEME',
      message: `Nouvelle demande de rendez-vous pour le ${dateLabel}.`,
      metadata: { appointmentId: appointment.id, category: 'RENDEZ_VOUS', event: 'CREATED' },
    }),
    sendAppointmentCreatedEmail({
      to: appointment.patient?.user?.email,
      appointment,
      role: 'patient',
    }),
    sendAppointmentCreatedEmail({
      to: appointment.doctor?.user?.email,
      appointment,
      role: 'doctor',
    }),
    sendSms({
      to: appointment.patient?.user?.phone,
      body: `TabibConnect: votre demande de RDV du ${dateLabel} a ete envoyee.`,
    }),
    sendSms({
      to: appointment.doctor?.user?.phone,
      body: `TabibConnect: nouvelle demande de RDV pour ${getPatientName(appointment)} (${dateLabel}).`,
    }),
  ]);
};

const sendAppointmentConfirmedNotifications = async (appointment) => {
  const dateLabel = formatDateForMessage(appointment.dateHeure);
  const doctorName = getDoctorName(appointment);

  await Promise.all([
    createNotification({
      userId: appointment.patient?.userId,
      type: 'RDV_CONFIRME',
      message: `Votre rendez-vous du ${dateLabel} avec ${doctorName} est confirme.`,
      metadata: { appointmentId: appointment.id, category: 'RENDEZ_VOUS', event: 'CONFIRMED' },
    }),
    createNotification({
      userId: appointment.doctor?.userId,
      type: 'RDV_CONFIRME',
      message: `Rendez-vous du ${dateLabel} confirme pour ${getPatientName(appointment)}.`,
      metadata: { appointmentId: appointment.id, category: 'RENDEZ_VOUS', event: 'CONFIRMED' },
    }),
    sendAppointmentConfirmationEmail({
      to: appointment.patient?.user?.email,
      appointment,
      role: 'patient',
    }),
    sendAppointmentConfirmationEmail({
      to: appointment.doctor?.user?.email,
      appointment,
      role: 'doctor',
    }),
    sendSms({
      to: appointment.patient?.user?.phone,
      body: `TabibConnect: votre RDV du ${dateLabel} est confirme.`,
    }),
    sendSms({
      to: appointment.doctor?.user?.phone,
      body: `TabibConnect: RDV confirme pour ${getPatientName(appointment)} (${dateLabel}).`,
    }),
  ]);
};

const sendAppointmentCancelledNotifications = async ({ appointment, cancelledByRole, freeCancellation }) => {
  const dateLabel = formatDateForMessage(appointment.dateHeure);
  const by = cancelledByRole === 'DOCTOR' ? 'le medecin' : 'le patient';

  await Promise.all([
    createNotification({
      userId: appointment.patient?.userId,
      type: 'RDV_ANNULE',
      message: `Le rendez-vous du ${dateLabel} a ete annule par ${by}.`,
      metadata: {
        appointmentId: appointment.id,
        category: 'RENDEZ_VOUS',
        event: 'CANCELLED',
        freeCancellation,
        cancelledByRole,
      },
    }),
    createNotification({
      userId: appointment.doctor?.userId,
      type: 'RDV_ANNULE',
      message: `Le rendez-vous du ${dateLabel} a ete annule par ${by}.`,
      metadata: {
        appointmentId: appointment.id,
        category: 'RENDEZ_VOUS',
        event: 'CANCELLED',
        freeCancellation,
        cancelledByRole,
      },
    }),
    sendAppointmentCancellationEmail({
      to: appointment.patient?.user?.email,
      appointment,
      cancelledByRole,
      freeCancellation,
    }),
    sendAppointmentCancellationEmail({
      to: appointment.doctor?.user?.email,
      appointment,
      cancelledByRole,
      freeCancellation,
    }),
    sendSms({
      to: appointment.patient?.user?.phone,
      body: `TabibConnect: RDV du ${dateLabel} annule par ${by}.`,
    }),
    sendSms({
      to: appointment.doctor?.user?.phone,
      body: `TabibConnect: RDV du ${dateLabel} annule par ${by}.`,
    }),
  ]);
};

const sendAppointmentReminderNotifications = async (appointment) => {
  const dateLabel = formatDateForMessage(appointment.dateHeure);

  await Promise.all([
    createNotification({
      userId: appointment.patient?.userId,
      type: 'RAPPEL_RDV',
      message: `Rappel: vous avez un rendez-vous le ${dateLabel}.`,
      metadata: { appointmentId: appointment.id, category: 'RENDEZ_VOUS', event: 'REMINDER' },
    }),
    createNotification({
      userId: appointment.doctor?.userId,
      type: 'RAPPEL_RDV',
      message: `Rappel: rendez-vous prevu le ${dateLabel}.`,
      metadata: { appointmentId: appointment.id, category: 'RENDEZ_VOUS', event: 'REMINDER' },
    }),
    sendAppointmentReminderEmail({
      to: appointment.patient?.user?.email,
      appointment,
      role: 'patient',
    }),
    sendAppointmentReminderEmail({
      to: appointment.doctor?.user?.email,
      appointment,
      role: 'doctor',
    }),
    sendSms({
      to: appointment.patient?.user?.phone,
      body: `TabibConnect rappel: RDV demain ${dateLabel}.`,
    }),
    sendSms({
      to: appointment.doctor?.user?.phone,
      body: `TabibConnect rappel: RDV demain ${dateLabel}.`,
    }),
  ]);
};

const sendAppointmentNoShowNotifications = async (appointment) => {
  const dateLabel = formatDateForMessage(appointment.dateHeure);

  await Promise.all([
    createNotification({
      userId: appointment.patient?.userId,
      type: 'SYSTEME',
      message: `Le rendez-vous du ${dateLabel} est passe en statut NO_SHOW.`,
      metadata: { appointmentId: appointment.id, category: 'RENDEZ_VOUS', event: 'NO_SHOW' },
    }),
    createNotification({
      userId: appointment.doctor?.userId,
      type: 'SYSTEME',
      message: `Le rendez-vous du ${dateLabel} est passe en statut NO_SHOW.`,
      metadata: { appointmentId: appointment.id, category: 'RENDEZ_VOUS', event: 'NO_SHOW' },
    }),
    sendAppointmentNoShowEmail({
      to: appointment.patient?.user?.email,
      appointment,
      role: 'patient',
    }),
    sendAppointmentNoShowEmail({
      to: appointment.doctor?.user?.email,
      appointment,
      role: 'doctor',
    }),
    sendSms({
      to: appointment.patient?.user?.phone,
      body: `TabibConnect: RDV du ${dateLabel} marque NO_SHOW.`,
    }),
    sendSms({
      to: appointment.doctor?.user?.phone,
      body: `TabibConnect: RDV du ${dateLabel} marque NO_SHOW.`,
    }),
  ]);
};

const sendAppointmentCompletedNotifications = async (appointment) => {
  const dateLabel = formatDateForMessage(appointment.dateHeure);

  await Promise.all([
    createNotification({
      userId: appointment.patient?.userId,
      type: 'SYSTEME',
      message: `Votre rendez-vous du ${dateLabel} est termine.`,
      metadata: { appointmentId: appointment.id, category: 'RENDEZ_VOUS', event: 'COMPLETED' },
    }),
    createNotification({
      userId: appointment.doctor?.userId,
      type: 'SYSTEME',
      message: `Rendez-vous du ${dateLabel} termine pour ${getPatientName(appointment)}.`,
      metadata: { appointmentId: appointment.id, category: 'RENDEZ_VOUS', event: 'COMPLETED' },
    }),
    sendAppointmentCompletedEmail({
      to: appointment.patient?.user?.email,
      appointment,
      role: 'patient',
    }),
    sendAppointmentCompletedEmail({
      to: appointment.doctor?.user?.email,
      appointment,
      role: 'doctor',
    }),
    sendSms({
      to: appointment.patient?.user?.phone,
      body: `TabibConnect: RDV du ${dateLabel} termine. Merci.`,
    }),
    sendSms({
      to: appointment.doctor?.user?.phone,
      body: `TabibConnect: RDV du ${dateLabel} termine pour ${getPatientName(appointment)}.`,
    }),
  ]);
};

const sendAppointmentRescheduledNotifications = async ({ appointment, previousDateHeure, rescheduledByRole, reason }) => {
  const dateLabel = formatDateForMessage(appointment.dateHeure);
  const previousLabel = formatDateForMessage(previousDateHeure);

  await Promise.all([
    createNotification({
      userId: appointment.patient?.userId,
      type: 'SYSTEME',
      message: `Votre rendez-vous a ete reprogramme du ${previousLabel} au ${dateLabel}.`,
      metadata: {
        appointmentId: appointment.id,
        category: 'RENDEZ_VOUS',
        event: 'RESCHEDULED',
        rescheduledByRole,
        reason,
      },
    }),
    createNotification({
      userId: appointment.doctor?.userId,
      type: 'SYSTEME',
      message: `Rendez-vous reprogramme du ${previousLabel} au ${dateLabel}.`,
      metadata: {
        appointmentId: appointment.id,
        category: 'RENDEZ_VOUS',
        event: 'RESCHEDULED',
        rescheduledByRole,
        reason,
      },
    }),
    sendAppointmentRescheduledEmail({
      to: appointment.patient?.user?.email,
      appointment,
      role: 'patient',
      previousDateHeure,
      rescheduledByRole,
      reason,
    }),
    sendAppointmentRescheduledEmail({
      to: appointment.doctor?.user?.email,
      appointment,
      role: 'doctor',
      previousDateHeure,
      rescheduledByRole,
      reason,
    }),
    sendSms({
      to: appointment.patient?.user?.phone,
      body: `TabibConnect: RDV reprogramme du ${previousLabel} au ${dateLabel}.`,
    }),
    sendSms({
      to: appointment.doctor?.user?.phone,
      body: `TabibConnect: RDV reprogramme du ${previousLabel} au ${dateLabel}.`,
    }),
  ]);
};

module.exports = {
  sendAppointmentCancelledNotifications,
  sendAppointmentConfirmedNotifications,
  sendAppointmentCreatedNotifications,
  sendAppointmentCompletedNotifications,
  sendAppointmentNoShowNotifications,
  sendAppointmentRescheduledNotifications,
  sendAppointmentReminderNotifications,
};

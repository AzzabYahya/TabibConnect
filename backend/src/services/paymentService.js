const prisma = require('../config/prisma');
const HttpError = require('../utils/httpError');
const { createNotification } = require('./notificationService');
const { retrieveCheckoutSession } = require('./paymentGatewayService');

const confirmCardPaymentSession = async ({ sessionId, appointmentId, userId }) => {
  if (!sessionId) {
    throw new HttpError(400, 'sessionId is required');
  }
  const session = await retrieveCheckoutSession(sessionId);
  const paymentId = session?.metadata?.paymentId;
  const linkedAppointmentId = session?.metadata?.appointmentId;

  if (!paymentId || !linkedAppointmentId) {
    throw new HttpError(400, 'Invalid payment session metadata');
  }
  if (appointmentId && appointmentId !== linkedAppointmentId) {
    throw new HttpError(400, 'Appointment mismatch');
  }

  const payment = await prisma.paiement.findUnique({
    where: { id: paymentId },
    include: {
      rendezVous: {
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
        },
      },
    },
  });
  if (!payment) {
    throw new HttpError(404, 'Payment not found');
  }
  if (payment.rendezVous.patient.userId !== userId) {
    throw new HttpError(403, 'You can only confirm your own payment');
  }

  const stripeStatus = session.payment_status;
  const mappedStatus = stripeStatus === 'paid' ? 'PAYE' : stripeStatus === 'unpaid' ? 'EN_ATTENTE' : 'ECHOUE';

  const updated = await prisma.paiement.update({
    where: { id: payment.id },
    data: {
      statut: mappedStatus,
      reference: session.id,
    },
  });

  if (mappedStatus === 'PAYE') {
    await Promise.all([
      createNotification({
        userId: payment.rendezVous.patient.userId,
        type: 'PAIEMENT_RECU',
        message: `Paiement carte confirmé. Référence: ${updated.reference}.`,
        metadata: {
          appointmentId: payment.rendezVous.id,
          category: 'PAIEMENT',
          event: 'PAID',
          reference: updated.reference,
        },
      }),
      createNotification({
        userId: payment.rendezVous.doctor.userId,
        type: 'PAIEMENT_RECU',
        message: `Paiement carte reçu pour le rendez-vous ${payment.rendezVous.id}.`,
        metadata: {
          appointmentId: payment.rendezVous.id,
          category: 'PAIEMENT',
          event: 'PAID',
          reference: updated.reference,
        },
      }),
    ]);
  }

  return {
    paymentId: updated.id,
    appointmentId: payment.rendezVous.id,
    paymentStatus: updated.statut,
    reference: updated.reference,
  };
};

module.exports = {
  confirmCardPaymentSession,
};


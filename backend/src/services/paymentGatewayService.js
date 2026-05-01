const Stripe = require('stripe');

const env = require('../config/env');
const HttpError = require('../utils/httpError');

let stripeClient = null;

const getStripeClient = () => {
  if (!env.stripeSecretKey) {
    throw new HttpError(503, 'Card payment gateway is not configured');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.stripeSecretKey);
  }
  return stripeClient;
};

const createCheckoutSession = async ({
  paymentId,
  appointmentId,
  amountMad,
  doctorName,
  patientEmail,
}) => {
  const stripe = getStripeClient();
  const amount = Math.round(Number(amountMad) * 100);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpError(400, 'Invalid payment amount');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: `${env.frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&appointmentId=${appointmentId}`,
    cancel_url: `${env.frontendUrl}/payment/cancel?appointmentId=${appointmentId}`,
    customer_email: patientEmail || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: env.stripeCurrency,
          unit_amount: amount,
          product_data: {
            name: `Consultation médicale - ${doctorName || 'TabibConnect'}`,
          },
        },
      },
    ],
    metadata: {
      paymentId,
      appointmentId,
    },
  });

  return session;
};

const retrieveCheckoutSession = async (sessionId) => {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.retrieve(sessionId);
};

module.exports = {
  createCheckoutSession,
  retrieveCheckoutSession,
};


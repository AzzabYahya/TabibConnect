const paymentService = require('../services/paymentService');

const confirmCardPaymentSession = async (req, res) => {
  const data = await paymentService.confirmCardPaymentSession({
    sessionId: req.body.sessionId,
    appointmentId: req.body.appointmentId,
    userId: req.user.id,
  });
  res.status(200).json({ status: 'success', data });
};

module.exports = {
  confirmCardPaymentSession,
};


const ordonnanceService = require('../services/ordonnanceService');

const createOrdonnance = async (req, res) => {
  const data = await ordonnanceService.createOrdonnance({
    appointmentId: req.params.id,
    userId: req.user.id,
    payload: req.body,
  });

  res.status(201).json({ status: 'success', data });
};

const uploadOrdonnance = async (req, res) => {
  const data = await ordonnanceService.uploadOrdonnance({
    appointmentId: req.params.id,
    userId: req.user.id,
    file: req.file,
  });

  res.status(201).json({ status: 'success', data });
};

const verifyOrdonnance = async (req, res) => {
  const data = await ordonnanceService.verifyOrdonnance({ qrCode: req.params.qrCode });
  res.status(200).json({ status: 'success', data });
};

const getOrdonnance = async (req, res) => {
  const data = await ordonnanceService.getOrdonnanceByAppointment({
    appointmentId: req.params.id,
    userId: req.user.id,
    role: req.user.role,
  });

  res.status(200).json({ status: 'success', data });
};

const resendOrdonnance = async (req, res) => {
  const data = await ordonnanceService.resendOrdonnance({
    appointmentId: req.params.id,
    userId: req.user.id,
    role: req.user.role,
  });

  res.status(200).json({ status: 'success', data });
};

module.exports = {
  createOrdonnance,
  uploadOrdonnance,
  verifyOrdonnance,
  getOrdonnance,
  resendOrdonnance,
};

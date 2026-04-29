const dashboardService = require('../services/dashboardService');
const doctorDashboardService = require('../services/doctorDashboardService');
const adminService = require('../services/adminService');

const getPatientDashboard = async (req, res) => {
  const dashboard = await dashboardService.getPatientDashboard({ userId: req.user.id });

  res.status(200).json({
    status: 'success',
    data: dashboard,
  });
};

const getDoctorDashboard = async (req, res) => {
  const dashboard = await doctorDashboardService.getDoctorDashboard({ userId: req.user.id });

  res.status(200).json({
    status: 'success',
    data: dashboard,
  });
};

const getAdminDashboard = async (req, res) => {
  const dashboard = await adminService.getAdminDashboard();

  res.status(200).json({
    status: 'success',
    data: dashboard,
  });
};

const getAdminAccountDetails = async (req, res) => {
  const payload = await adminService.getAdminAccountDetails({ userId: req.params.userId });
  res.status(200).json({
    status: 'success',
    data: payload,
  });
};

const verifyDoctor = async (req, res) => {
  const doctor = await adminService.verifyDoctor({ doctorId: req.params.doctorId });

  res.status(200).json({
    status: 'success',
    message: 'Doctor verified successfully',
    data: doctor,
  });
};

const verifyReview = async (req, res) => {
  const review = await adminService.verifyReview({ reviewId: req.params.reviewId });

  res.status(200).json({
    status: 'success',
    message: 'Review verified successfully',
    data: review,
  });
};

const notifyAccount = async (req, res) => {
  const result = await adminService.notifyAccount({
    userId: req.params.userId,
    channel: req.body.channel,
    subject: req.body.subject,
    message: req.body.message,
  });

  res.status(200).json({
    status: 'success',
    message: 'Notification sent',
    data: result,
  });
};

const approveDoctorChangeRequest = async (req, res) => {
  const result = await adminService.approveDoctorChangeRequest({
    requestId: req.params.requestId,
    adminUserId: req.user.id,
    reviewNote: req.body.reviewNote,
  });
  res.status(200).json({
    status: 'success',
    message: 'Doctor change request approved',
    data: result,
  });
};

const rejectDoctorChangeRequest = async (req, res) => {
  const result = await adminService.rejectDoctorChangeRequest({
    requestId: req.params.requestId,
    adminUserId: req.user.id,
    reviewNote: req.body.reviewNote,
  });
  res.status(200).json({
    status: 'success',
    message: 'Doctor change request rejected',
    data: result,
  });
};

const createAccountByAdmin = async (req, res) => {
  const result = await adminService.createAccountByAdmin({
    payload: req.body,
    cinDocumentFile: req.file || null,
  });
  res.status(201).json({
    status: 'success',
    message: 'Account created',
    data: result,
  });
};

module.exports = {
  getAdminDashboard,
  getAdminAccountDetails,
  getDoctorDashboard,
  getPatientDashboard,
  notifyAccount,
  approveDoctorChangeRequest,
  rejectDoctorChangeRequest,
  createAccountByAdmin,
  verifyDoctor,
  verifyReview,
};
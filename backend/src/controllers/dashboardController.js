const dashboardService = require('../services/dashboardService');
const doctorDashboardService = require('../services/doctorDashboardService');
const adminService = require('../services/adminService');
const patientChangeRequestService = require('../services/patientChangeRequestService');
const { logAudit } = require('../utils/auditLogger');

const getPatientDashboard = async (req, res) => {
  const dashboard = await dashboardService.getPatientDashboard({ userId: req.user.id });

  res.status(200).json({
    status: 'success',
    data: dashboard,
  });
};

const getPatientHistory = async (req, res) => {
  const data = await dashboardService.getPatientHistory({
    userId: req.user.id,
    page: req.query.page,
    limit: req.query.limit,
    status: req.query.status,
  });
  res.status(200).json({ status: 'success', data });
};

const getPatientRecurringDoctors = async (req, res) => {
  const data = await dashboardService.getPatientRecurringDoctors({ userId: req.user.id });
  res.status(200).json({ status: 'success', data });
};

const getPatientNotifications = async (req, res) => {
  const data = await dashboardService.getPatientNotifications({
    userId: req.user.id,
    page: req.query.page,
    limit: req.query.limit,
  });
  res.status(200).json({ status: 'success', data });
};

const markPatientNotificationsRead = async (req, res) => {
  const data = await dashboardService.markPatientNotificationsRead({ userId: req.user.id });
  res.status(200).json({ status: 'success', data });
};

const submitPatientChangeRequest = async (req, res) => {
  const data = await patientChangeRequestService.submitPatientChangeRequest({ userId: req.user.id, payload: req.body });
  res.status(201).json({ status: 'success', data });
};

const listMyPatientChangeRequests = async (req, res) => {
  const data = await patientChangeRequestService.listMyPatientChangeRequests({ userId: req.user.id });
  res.status(200).json({ status: 'success', data });
};

const listPendingPatientChangeRequests = async (req, res) => {
  const data = await patientChangeRequestService.listPendingPatientChangeRequests({
    page: req.query.page,
    limit: req.query.limit,
  });
  res.status(200).json({ status: 'success', data });
};

const approvePatientChangeRequest = async (req, res) => {
  const data = await patientChangeRequestService.approvePatientChangeRequest({
    requestId: req.params.requestId,
    adminUserId: req.user.id,
    reviewNote: req.body.reviewNote,
  });
  res.status(200).json({ status: 'success', data });
};

const rejectPatientChangeRequest = async (req, res) => {
  const data = await patientChangeRequestService.rejectPatientChangeRequest({
    requestId: req.params.requestId,
    adminUserId: req.user.id,
    reviewNote: req.body.reviewNote,
  });
  res.status(200).json({ status: 'success', data });
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

  await logAudit({
    req,
    action: 'DOCTOR_VERIFIED',
    targetId: req.params.doctorId,
    payload: { doctorName: doctor.nomComplet },
  });

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

  await logAudit({
    req,
    action: 'DOCTOR_CHANGE_APPROVED',
    targetId: req.params.requestId,
    payload: { doctorId: result.doctorId, type: result.type },
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

const getAdminUsers = async (req, res) => {
  const payload = await adminService.getAdminUsers({
    page: req.query.page,
    limit: req.query.limit,
    role: req.query.role,
    search: req.query.search,
    city: req.query.city,
    status: req.query.status,
    sortBy: req.query.sortBy,
    sortDir: req.query.sortDir,
  });
  res.status(200).json({ status: 'success', data: payload });
};

const getAdminLogs = async (req, res) => {
  const payload = await adminService.getAdminLogs({
    page: req.query.page,
    limit: req.query.limit,
    type: req.query.type,
  });
  res.status(200).json({ status: 'success', data: payload });
};

const getAdminMetrics = async (req, res) => {
  const payload = await adminService.getAdminMetrics();
  res.status(200).json({ status: 'success', data: payload });
};

const getAdminDoctors = async (req, res) => {
  const payload = await adminService.getAdminDoctors({
    page: req.query.page,
    limit: req.query.limit,
    status: req.query.status,
    search: req.query.search,
    sortBy: req.query.sortBy,
    sortDir: req.query.sortDir,
  });
  res.status(200).json({ status: 'success', data: payload });
};

const updateDoctorProfileByAdmin = async (req, res) => {
  const payload = await adminService.updateDoctorProfileByAdmin({
    doctorId: req.params.doctorId,
    payload: req.body,
  });
  res.status(200).json({ status: 'success', data: payload });
};

const rejectDoctor = async (req, res) => {
  const payload = await adminService.rejectDoctor({
    doctorId: req.params.doctorId,
    reason: req.body.reason,
  });

  await logAudit({
    req,
    action: 'DOCTOR_REJECTED',
    targetId: req.params.doctorId,
    payload: { reason: req.body.reason },
  });

  res.status(200).json({ status: 'success', data: payload });
};

const updatePatientProfileByAdmin = async (req, res) => {
  const payload = await adminService.updatePatientProfileByAdmin({
    patientId: req.params.patientId,
    payload: req.body,
  });
  res.status(200).json({ status: 'success', data: payload });
};

const getAdminReviews = async (req, res) => {
  const payload = await adminService.getAdminReviews({
    page: req.query.page,
    limit: req.query.limit,
    status: req.query.status,
    search: req.query.search,
  });
  res.status(200).json({ status: 'success', data: payload });
};

const rejectReview = async (req, res) => {
  const payload = await adminService.rejectReview({
    reviewId: req.params.reviewId,
    reason: req.body.reason,
  });
  res.status(200).json({ status: 'success', data: payload });
};

const getAdminNotifications = async (req, res) => {
  const payload = await adminService.getAdminNotifications({
    page: req.query.page,
    limit: req.query.limit,
    isRead: req.query.isRead,
    search: req.query.search,
  });
  res.status(200).json({ status: 'success', data: payload });
};

const markNotificationsRead = async (req, res) => {
  const payload = await adminService.markNotificationsRead({ ids: req.body.ids });
  res.status(200).json({ status: 'success', data: payload });
};

const disableUser = async (req, res) => {
  const payload = await adminService.disableUser({ userId: req.params.userId });

  await logAudit({
    req,
    action: 'USER_DISABLED',
    targetId: req.params.userId,
  });

  res.status(200).json({ status: 'success', data: payload });
};

const deleteUser = async (req, res) => {
  const payload = await adminService.deleteUser({ userId: req.params.userId });
  res.status(200).json({ status: 'success', data: payload });
};

const getPatientProfileManagement = async (req, res) => {
  const data = await dashboardService.getPatientProfileManagement({ userId: req.user.id });
  res.status(200).json({ status: 'success', data });
};
const getAdminAppointments = async (req, res) => {
  const payload = await adminService.getAdminAppointments({
    page: req.query.page,
    limit: req.query.limit,
    status: req.query.status,
    search: req.query.search,
  });
  res.status(200).json({ status: 'success', data: payload });
};

const updateProfilePhotoByAdmin = async (req, res) => {
  const data = await adminService.updateProfilePhotoByAdmin({
    userId: req.params.userId,
    file: req.file,
  });
  res.status(200).json({ status: 'success', data });
};

module.exports = {
  updateProfilePhotoByAdmin,
  getAdminAppointments,

  getAdminDashboard,
  getAdminAccountDetails,
  getDoctorDashboard,
  getPatientDashboard,
  getPatientProfileManagement,
  getPatientHistory,
  getPatientRecurringDoctors,
  getPatientNotifications,
  markPatientNotificationsRead,
  submitPatientChangeRequest,
  listMyPatientChangeRequests,
  listPendingPatientChangeRequests,
  approvePatientChangeRequest,
  rejectPatientChangeRequest,
  notifyAccount,
  approveDoctorChangeRequest,
  rejectDoctorChangeRequest,
  createAccountByAdmin,
  verifyDoctor,
  verifyReview,
  getAdminUsers,
  getAdminLogs,
  getAdminMetrics,
  getAdminDoctors,
  updateDoctorProfileByAdmin,
  updatePatientProfileByAdmin,
  rejectDoctor,
  getAdminReviews,
  rejectReview,
  getAdminNotifications,
  markNotificationsRead,
  disableUser,
  deleteUser,
};
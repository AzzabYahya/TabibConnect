const doctorService = require('../services/doctorService');

const listDoctors = async (req, res) => {
  const doctors = await doctorService.listDoctors(req.query);

  res.status(200).json({
    status: 'success',
    data: doctors,
  });
};

const getDoctorProfile = async (req, res) => {
  const doctor = await doctorService.getDoctorProfile(req.params.id);

  res.status(200).json({
    status: 'success',
    data: doctor,
  });
};

const searchDoctors = async (req, res) => {
  const result = await doctorService.searchDoctors(req.query.q || '');

  res.status(200).json({
    status: 'success',
    data: result,
  });
};

const updateDoctorProfile = async (req, res) => {
  const updated = await doctorService.updateDoctorProfile({
    userId: req.user.id,
    payload: req.body,
  });

  res.status(200).json({
    status: 'success',
    message: 'Doctor profile updated successfully',
    data: updated,
  });
};

const uploadDoctorProfilePhoto = async (req, res) => {
  const result = await doctorService.uploadDoctorProfilePhoto({
    userId: req.user.id,
    file: req.file,
  });
  res.status(200).json({
    status: 'success',
    message: 'Photo de profil envoyée. Validation admin requise.',
    data: result,
  });
};

const getDoctorAvailabilities = async (req, res) => {
  const availabilities = await doctorService.getDoctorAvailabilitiesForDate({
    doctorId: req.params.id,
    dateISO: req.query.date,
  });

  res.status(200).json({
    status: 'success',
    data: {
      doctorId: req.params.id,
      date: req.query.date,
      availabilities,
    },
  });
};

const getDoctorReviews = async (req, res) => {
  const reviews = await doctorService.getDoctorReviews({
    doctorId: req.params.id,
    page: req.query.page,
    limit: req.query.limit,
  });

  res.status(200).json({
    status: 'success',
    data: reviews,
  });
};

const getDoctorProfileManagement = async (req, res) => {
  const data = await doctorService.getDoctorProfileManagement({ userId: req.user.id });
  res.status(200).json({
    status: 'success',
    data,
  });
};

const createDoctorAvailability = async (req, res) => {
  const data = await doctorService.createDoctorAvailability({
    userId: req.user.id,
    payload: req.body,
  });
  res.status(201).json({
    status: 'success',
    data,
  });
};

const updateDoctorAvailability = async (req, res) => {
  const data = await doctorService.updateDoctorAvailability({
    userId: req.user.id,
    availabilityId: req.params.availabilityId,
    payload: req.body,
  });
  res.status(200).json({
    status: 'success',
    data,
  });
};

const deleteDoctorAvailability = async (req, res) => {
  await doctorService.deleteDoctorAvailability({
    userId: req.user.id,
    availabilityId: req.params.availabilityId,
  });
  res.status(200).json({
    status: 'success',
    message: 'Availability deleted',
  });
};

const submitDoctorChangeRequest = async (req, res) => {
  const data = await doctorService.submitDoctorChangeRequest({
    userId: req.user.id,
    payload: req.body,
  });
  res.status(201).json({
    status: 'success',
    message: 'Change request submitted to admin',
    data,
  });
};

const listDoctorChangeRequests = async (req, res) => {
  const data = await doctorService.listDoctorChangeRequests({ userId: req.user.id });
  res.status(200).json({
    status: 'success',
    data,
  });
};

const updateDoctorChangeRequest = async (req, res) => {
  const data = await doctorService.updateDoctorChangeRequest({
    userId: req.user.id,
    requestId: req.params.requestId,
    payload: req.body,
  });
  res.status(200).json({
    status: 'success',
    message: 'Change request updated',
    data,
  });
};

const cancelDoctorChangeRequest = async (req, res) => {
  await doctorService.cancelDoctorChangeRequest({
    userId: req.user.id,
    requestId: req.params.requestId,
  });
  res.status(200).json({
    status: 'success',
    message: 'Change request cancelled',
  });
};

const getDoctorAgenda = async (req, res) => {
  const data = await doctorService.getDoctorAgenda({
    userId: req.user.id,
    weekStartISO: req.query.weekStart,
  });
  res.status(200).json({ status: 'success', data });
};

const listDoctorPatients = async (req, res) => {
  const data = await doctorService.listDoctorPatients({
    userId: req.user.id,
    page: req.query.page,
    limit: req.query.limit,
    search: req.query.search,
  });
  res.status(200).json({ status: 'success', data });
};

const getDoctorReceivedReviews = async (req, res) => {
  const data = await doctorService.getDoctorReceivedReviews({
    userId: req.user.id,
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort,
  });
  res.status(200).json({ status: 'success', data });
};

const getDoctorPatientHistory = async (req, res) => {
  const data = await doctorService.getDoctorPatientHistory({
    userId: req.user.id,
    patientId: req.params.patientId,
    page: req.query.page,
    limit: req.query.limit,
  });
  res.status(200).json({ status: 'success', data });
};

const getDoctorStats = async (req, res) => {
  const data = await doctorService.getDoctorStats({ userId: req.user.id });
  res.status(200).json({ status: 'success', data });
};

module.exports = {
  getDoctorAvailabilities,
  getDoctorProfile,
  getDoctorReviews,
  listDoctors,
  searchDoctors,
  getDoctorProfileManagement,
  createDoctorAvailability,
  updateDoctorAvailability,
  deleteDoctorAvailability,
  submitDoctorChangeRequest,
  listDoctorChangeRequests,
  updateDoctorChangeRequest,
  cancelDoctorChangeRequest,
  updateDoctorProfile,
  uploadDoctorProfilePhoto,
  getDoctorAgenda,
  listDoctorPatients,
  getDoctorReceivedReviews,
  getDoctorPatientHistory,
  getDoctorStats,
};

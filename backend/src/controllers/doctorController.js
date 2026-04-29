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
};

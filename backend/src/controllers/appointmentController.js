const appointmentService = require('../services/appointmentService');
const { logAction } = require('../services/auditService');


const createAppointment = async (req, res) => {
  const appointment = await appointmentService.createAppointment({
    userId: req.user.id,
    payload: req.body,
  });

  await logAction({
    userId: req.user.id,
    action: 'RDV_CREATED',
    resource: `Appointment:${appointment.id}`,
    payload: { doctorId: appointment.doctorId, dateHeure: appointment.dateHeure },
    req,
  });

  res.status(201).json({
    status: 'success',
    message: 'Appointment created successfully',
    data: appointment,
  });
};

const createReview = async (req, res) => {
  const review = await appointmentService.createReview({
    appointmentId: req.params.id,
    userId: req.user.id,
    payload: req.body,
  });

  res.status(201).json({
    status: 'success',
    message: 'Review created successfully',
    data: review,
  });
};

const getAppointmentById = async (req, res) => {
  const appointment = await appointmentService.getAppointmentDetails({
    appointmentId: req.params.id,
    userId: req.user.id,
    role: req.user.role,
  });

  res.status(200).json({
    status: 'success',
    data: appointment,
  });
};

const getMyAppointments = async (req, res) => {
  const appointments = await appointmentService.getMyAppointments({
    userId: req.user.id,
    role: req.user.role,
  });

  res.status(200).json({
    status: 'success',
    data: appointments,
  });
};

const confirmAppointment = async (req, res) => {
  const appointment = await appointmentService.confirmAppointment({
    appointmentId: req.params.id,
    userId: req.user.id,
  });

  await logAction({
    userId: req.user.id,
    action: 'RDV_CONFIRMED',
    resource: `Appointment:${appointment.id}`,
    req,
  });

  res.status(200).json({
    status: 'success',
    message: 'Appointment confirmed successfully',
    data: appointment,
  });
};

const cancelAppointment = async (req, res) => {
  const result = await appointmentService.cancelAppointment({
    appointmentId: req.params.id,
    userId: req.user.id,
    role: req.user.role,
    reason: req.body.reason,
  });

  await logAction({
    userId: req.user.id,
    action: 'RDV_CANCELLED',
    resource: `Appointment:${req.params.id}`,
    payload: { reason: req.body.reason },
    req,
  });

  res.status(200).json({
    status: 'success',
    message: 'Appointment cancelled successfully',
    data: result,
  });
};

const completeAppointment = async (req, res) => {
  const appointment = await appointmentService.completeAppointment({
    appointmentId: req.params.id,
    userId: req.user.id,
  });

  res.status(200).json({
    status: 'success',
    message: 'Appointment marked as completed',
    data: appointment,
  });
};

const rescheduleAppointment = async (req, res) => {
  const appointment = await appointmentService.rescheduleAppointment({
    appointmentId: req.params.id,
    userId: req.user.id,
    role: req.user.role,
    payload: req.body,
  });

  res.status(200).json({
    status: 'success',
    message: 'Appointment rescheduled successfully',
    data: appointment,
  });
};

const getUpcomingAppointments = async (req, res) => {
  const appointments = await appointmentService.getUpcomingAppointments({
    userId: req.user.id,
    role: req.user.role,
  });

  res.status(200).json({
    status: 'success',
    data: appointments,
  });
};

const createDoctorPatientNote = async (req, res) => {
  const note = await appointmentService.createDoctorPatientNote({
    appointmentId: req.params.id,
    userId: req.user.id,
    payload: req.body,
  });

  res.status(201).json({
    status: 'success',
    message: 'Patient note created successfully',
    data: note,
  });
};

module.exports = {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  createAppointment,
  createDoctorPatientNote,
  createReview,
  getAppointmentById,
  getMyAppointments,
  getUpcomingAppointments,
  rescheduleAppointment,
};

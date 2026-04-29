const cabinetService = require('../services/cabinetService');

const createCabinet = async (req, res) => {
  const cabinet = await cabinetService.createCabinet({
    userId: req.user.id,
    payload: req.body,
  });

  res.status(201).json({
    status: 'success',
    message: 'Cabinet created successfully',
    data: cabinet,
  });
};

const getCabinetDetails = async (req, res) => {
  const cabinet = await cabinetService.getCabinetDetails(req.params.id);

  res.status(200).json({
    status: 'success',
    data: cabinet,
  });
};

const getNearbyCabinets = async (req, res) => {
  const cabinets = await cabinetService.findNearbyCabinets({
    latitude: req.query.lat,
    longitude: req.query.lng,
    radius: req.query.radius,
  });

  res.status(200).json({
    status: 'success',
    data: {
      count: cabinets.length,
      cabinets,
    },
  });
};

module.exports = {
  createCabinet,
  getCabinetDetails,
  getNearbyCabinets,
};

const homeService = require('../services/homeService');

const getHomeSummary = async (_req, res) => {
  const summary = await homeService.getHomeSummary();

  res.status(200).json({
    status: 'success',
    data: summary,
  });
};

module.exports = {
  getHomeSummary,
};

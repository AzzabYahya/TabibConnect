const getHealth = (req, res) => {
  res.status(200).json({
    status: 'OK',
    project: 'TabibConnect',
    version: '1.0.0',
  });
};

module.exports = {
  getHealth,
};

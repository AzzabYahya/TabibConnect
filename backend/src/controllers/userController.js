const userService = require('../services/userService');

const getUserProfile = async (req, res) => {
  const payload = await userService.getUserProfile({
    requester: req.user,
    userId: req.params.userId,
  });

  res.status(200).json({
    status: 'success',
    data: payload,
  });
};

module.exports = {
  getUserProfile,
};


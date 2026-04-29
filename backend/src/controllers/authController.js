const jwt = require('jsonwebtoken');

const env = require('../config/env');
const authService = require('../services/authService');
const HttpError = require('../utils/httpError');
const {
  clearRefreshTokenCookie,
  setRefreshTokenCookie,
} = require('../utils/tokenUtils');

const registerPatient = async (req, res) => {
  const result = await authService.registerPatient(req.body, req.file || null);

  setRefreshTokenCookie(res, result.refreshToken);

  return res.status(201).json({
    status: 'success',
    message: 'Patient account created. Please verify your email.',
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
};

const registerDoctor = async (req, res) => {
  const doctorFiles = Array.isArray(req.files?.documents) ? req.files.documents : [];
  const cinDocumentFile = Array.isArray(req.files?.cinDocument) ? req.files.cinDocument[0] : null;
  const result = await authService.registerDoctor(req.body, doctorFiles, cinDocumentFile);

  setRefreshTokenCookie(res, result.refreshToken);

  return res.status(201).json({
    status: 'success',
    message: 'Doctor account created. Please verify your email.',
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
};

const login = async (req, res) => {
  const result = await authService.login(req.body);

  setRefreshTokenCookie(res, result.refreshToken);

  return res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
};

const logout = async (req, res) => {
  const refreshTokenValue = req.cookies?.[env.refreshTokenCookieName];

  if (refreshTokenValue) {
    try {
      const payload = jwt.verify(refreshTokenValue, env.jwtRefreshSecret);

      if (payload.tokenType === 'refresh' && payload.sub) {
        await authService.logout({ userId: payload.sub });
      }
    } catch (error) {
      if (error?.name !== 'TokenExpiredError' && error?.name !== 'JsonWebTokenError') {
        throw error;
      }
    }
  }

  clearRefreshTokenCookie(res);

  return res.status(200).json({
    status: 'success',
    message: 'Logout successful',
  });
};

const deleteAccount = async (req, res) => {
  await authService.deleteAccount({
    userId: req.user.id,
    reason: req.body.reason,
    reasonDetail: req.body.reasonDetail,
    acceptDeletionTerms: req.body.acceptDeletionTerms,
  });

  clearRefreshTokenCookie(res);

  return res.status(200).json({
    status: 'success',
    message: 'Account deleted successfully',
  });
};

const getCurrentUser = async (req, res) => {
  const user = await authService.getCurrentUser({ userId: req.user.id });

  return res.status(200).json({
    status: 'success',
    data: user,
  });
};

const refreshToken = async (req, res) => {
  const refreshTokenValue = req.cookies?.[env.refreshTokenCookieName];

  if (!refreshTokenValue) {
    throw new HttpError(401, 'Refresh token cookie is missing');
  }

  const result = await authService.refreshToken({ refreshTokenValue });

  setRefreshTokenCookie(res, result.refreshToken);

  return res.status(200).json({
    status: 'success',
    message: 'Token refreshed',
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
};

const verifyEmail = async (req, res) => {
  await authService.verifyEmail({ token: req.params.token });

  return res.status(200).json({
    status: 'success',
    message: 'Email verified successfully',
  });
};

const forgotPassword = async (req, res) => {
  await authService.forgotPassword({ email: req.body.email });

  return res.status(200).json({
    status: 'success',
    message:
      'If an account exists with this email, a password reset message has been sent.',
  });
};

const resetPassword = async (req, res) => {
  await authService.resetPassword({
    token: req.params.token,
    password: req.body.password,
  });

  return res.status(200).json({
    status: 'success',
    message: 'Password has been reset successfully',
  });
};

module.exports = {
  forgotPassword,
  deleteAccount,
  getCurrentUser,
  login,
  logout,
  refreshToken,
  registerDoctor,
  registerPatient,
  resetPassword,
  verifyEmail,
};

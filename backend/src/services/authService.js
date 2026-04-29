const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Prisma } = require('@prisma/client');

const prisma = require('../config/prisma');
const env = require('../config/env');
const HttpError = require('../utils/httpError');
const {
  createAccessToken,
  createRefreshToken,
  generateOpaqueToken,
  getFutureDateFromDuration,
  hashOpaqueToken,
} = require('../utils/tokenUtils');
const { verifyCinDocument } = require('./cinVerificationService');
const { sendResetPasswordEmail, sendVerificationEmail } = require('./emailService');
const { sendSms } = require('./smsService');

const toStringList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const toBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }

  return false;
};

const toStoredDocumentRef = (file) => ({
  fileName: file?.originalname || null,
  filePath: file?.path || null,
  mimeType: file?.mimetype || null,
  size: Number.isFinite(file?.size) ? Number(file.size) : null,
  uploadedAt: file ? new Date() : null,
});

const mapUserResponse = (user) => ({
  id: user.id,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isVerified: user.isVerified,
  patientId: user.patient?.id || null,
  doctorId: user.doctor?.id || null,
  createdAt: user.createdAt,
});

const getCurrentUser = async ({ userId }) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patient: true,
      doctor: true,
    },
  });

  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  return mapUserResponse(user);
};

const issueSessionTokens = async ({ userId, role }) => {
  const accessToken = createAccessToken({ id: userId, role });
  const refreshToken = createRefreshToken({ id: userId, role });

  const refreshTokenHash = await bcrypt.hash(refreshToken, env.bcryptSaltRounds);
  const refreshTokenExpiresAt = getFutureDateFromDuration(
    env.jwtRefreshExpiresIn,
    7 * 24 * 60 * 60 * 1000
  );

  await prisma.user.update({
    where: { id: userId },
    data: {
      refreshTokenHash,
      refreshTokenExpiresAt,
      lastLoginAt: new Date(),
    },
  });

  return {
    accessToken,
    refreshToken,
  };
};

const ensureUserCanRegister = async ({ email, phone }) => {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phone }],
    },
    select: { id: true },
  });

  if (existingUser) {
    throw new HttpError(409, 'An account with this email or phone already exists');
  }
};

const registerPatient = async (payload, cinDocumentFile) => {
  if (!cinDocumentFile) {
    throw new HttpError(400, 'National ID document is required');
  }

  const cinDocumentRef = toStoredDocumentRef(cinDocumentFile);
  const cinVerification = env.cinVerificationEnabled
    ? await verifyCinDocument({
        file: cinDocumentFile,
        expectedCin: payload.cin,
      })
    : { status: 'PENDING', score: null, note: 'verification_disabled' };

  if (env.cinVerificationEnabled && env.cinVerificationStrict && cinVerification.status !== 'VERIFIED') {
    throw new HttpError(
      400,
      'National ID verification failed. Please upload a clear CIN document.'
    );
  }

  await ensureUserCanRegister({ email: payload.email, phone: payload.phone });

  const existingCin = await prisma.patient.findUnique({
    where: { cin: payload.cin },
    select: { id: true },
  });

  if (existingCin) {
    throw new HttpError(409, 'A patient with this CIN already exists');
  }

  const verificationToken = generateOpaqueToken();
  const verificationTokenHash = hashOpaqueToken(verificationToken);
  const verificationTokenExpiresAt = getFutureDateFromDuration(
    `${env.emailVerificationTokenExpiresMinutes}m`,
    24 * 60 * 60 * 1000
  );

  const hashedPassword = await bcrypt.hash(payload.password, env.bcryptSaltRounds);

  const user = await prisma.user.create({
    data: {
      email: payload.email,
      password: hashedPassword,
      phone: payload.phone,
      role: 'PATIENT',
      isVerified: false,
      emailVerificationTokenHash: verificationTokenHash,
      emailVerificationExpiresAt: verificationTokenExpiresAt,
      patient: {
        create: {
          cin: payload.cin,
          cinDocumentFileName: cinDocumentRef.fileName,
          cinDocumentFilePath: cinDocumentRef.filePath,
          cinDocumentMimeType: cinDocumentRef.mimeType,
          cinDocumentSize: cinDocumentRef.size,
          cinDocumentUploadedAt: cinDocumentRef.uploadedAt,
          cinDocumentVerificationStatus: cinVerification.status,
          cinDocumentVerificationScore: cinVerification.score,
          cinDocumentVerificationNote: cinVerification.note,
          cinDocumentVerifiedAt: cinVerification.status === 'VERIFIED' ? new Date() : null,
          cinDocumentRejectedAt: cinVerification.status === 'REJECTED' ? new Date() : null,
          dateOfNaissance: new Date(payload.dateOfNaissance),
          sexe: payload.sexe,
          adresse: payload.adresse,
          ville: payload.ville,
          groupeSanguin: payload.groupeSanguin || null,
          antecedents: payload.antecedents || null,
        },
      },
    },
    include: {
      patient: true,
      doctor: true,
    },
  });

  await sendVerificationEmail({
    email: user.email,
    token: verificationToken,
  });
  await sendSms({
    to: user.phone,
    body: 'TabibConnect: votre compte patient a ete cree avec succes.',
  });

  const tokens = await issueSessionTokens({ userId: user.id, role: user.role });

  return {
    user: mapUserResponse(user),
    ...tokens,
  };
};

const registerDoctor = async (payload, files = [], cinDocumentFile = null) => {
  if (!files.length) {
    throw new HttpError(400, 'At least one verification document is required');
  }
  if (!cinDocumentFile) {
    throw new HttpError(400, 'National ID document is required');
  }

  const cinDocumentRef = toStoredDocumentRef(cinDocumentFile);
  const cinVerification = env.cinVerificationEnabled
    ? await verifyCinDocument({
        file: cinDocumentFile,
        expectedCin: payload.cin,
      })
    : { status: 'PENDING', score: null, note: 'verification_disabled' };

  if (env.cinVerificationEnabled && env.cinVerificationStrict && cinVerification.status !== 'VERIFIED') {
    throw new HttpError(
      400,
      'National ID verification failed. Please upload a clear CIN document.'
    );
  }

  await ensureUserCanRegister({ email: payload.email, phone: payload.phone });

  const existingDoctor = await prisma.doctor.findUnique({
    where: { inpe: payload.inpe },
    select: { id: true },
  });

  if (existingDoctor) {
    throw new HttpError(409, 'A doctor with this INPE already exists');
  }

  const verificationToken = generateOpaqueToken();
  const verificationTokenHash = hashOpaqueToken(verificationToken);
  const verificationTokenExpiresAt = getFutureDateFromDuration(
    `${env.emailVerificationTokenExpiresMinutes}m`,
    24 * 60 * 60 * 1000
  );

  const hashedPassword = await bcrypt.hash(payload.password, env.bcryptSaltRounds);

  const user = await prisma.user.create({
    data: {
      email: payload.email,
      password: hashedPassword,
      phone: payload.phone,
      role: 'DOCTOR',
      isVerified: false,
      emailVerificationTokenHash: verificationTokenHash,
      emailVerificationExpiresAt: verificationTokenExpiresAt,
      doctor: {
        create: {
          cinDocumentFileName: cinDocumentRef.fileName,
          cinDocumentFilePath: cinDocumentRef.filePath,
          cinDocumentMimeType: cinDocumentRef.mimeType,
          cinDocumentSize: cinDocumentRef.size,
          cinDocumentUploadedAt: cinDocumentRef.uploadedAt,
          cinDocumentVerificationStatus: cinVerification.status,
          cinDocumentVerificationScore: cinVerification.score,
          cinDocumentVerificationNote: cinVerification.note,
          cinDocumentVerifiedAt: cinVerification.status === 'VERIFIED' ? new Date() : null,
          cinDocumentRejectedAt: cinVerification.status === 'REJECTED' ? new Date() : null,
          nomComplet: payload.nomComplet || null,
          inpe: payload.inpe,
          specialite: payload.specialite,
          diplomes: toStringList(payload.diplomes),
          languesParlees: toStringList(payload.languesParlees),
          tarifConsultation: new Prisma.Decimal(payload.tarifConsultation),
          accepteAssurance: toBoolean(payload.accepteAssurance),
          assurancesAcceptees: toStringList(payload.assurancesAcceptees),
          bio: payload.bio || null,
          experience: Number(payload.experience),
          documents: {
            create: files.map((file) => ({
              fileName: file.originalname,
              filePath: file.path,
              mimeType: file.mimetype,
              size: file.size,
            })),
          },
        },
      },
    },
    include: {
      patient: true,
      doctor: true,
    },
  });

  await sendVerificationEmail({
    email: user.email,
    token: verificationToken,
  });
  await sendSms({
    to: user.phone,
    body: 'TabibConnect: votre compte medecin a ete cree. Verification administrative en cours.',
  });

  const tokens = await issueSessionTokens({ userId: user.id, role: user.role });

  return {
    user: mapUserResponse(user),
    ...tokens,
  };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      patient: true,
      doctor: true,
    },
  });

  if (!user) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new HttpError(401, 'Invalid email or password');
  }

  if (!user.isVerified) {
    throw new HttpError(403, 'Please verify your email before logging in');
  }

  const tokens = await issueSessionTokens({ userId: user.id, role: user.role });

  return {
    user: mapUserResponse(user),
    ...tokens,
  };
};

const logout = async ({ userId }) => {
  // Logout should be idempotent: if the user no longer exists,
  // we still clear cookies on controller level and return success.
  await prisma.user.updateMany({
    where: { id: userId },
    data: {
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    },
  });
};

const deleteAccount = async ({ userId, reason, reasonDetail, acceptDeletionTerms }) => {
  if (!acceptDeletionTerms) {
    throw new HttpError(400, 'Deletion terms must be accepted');
  }

  const normalizedReason = String(reason || '').trim();
  const normalizedReasonDetail = String(reasonDetail || '').trim();

  if (!['PLUS_BESOIN', 'CONFIDENTIALITE', 'TROP_COUTEUX', 'AUTRE'].includes(normalizedReason)) {
    throw new HttpError(400, 'Invalid account deletion reason');
  }

  if (normalizedReason === 'AUTRE' && !normalizedReasonDetail) {
    throw new HttpError(400, 'Please provide a detail for the selected reason');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patient: true,
      doctor: true,
    },
  });

  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  const patientId = user.patient?.id || null;
  const doctorId = user.doctor?.id || null;

  await prisma.$transaction(async (transaction) => {
    if (patientId) {
      await transaction.rendezVous.deleteMany({
        where: { patientId },
      });
    }

    if (doctorId) {
      await transaction.rendezVous.deleteMany({
        where: { doctorId },
      });
    }

    await transaction.user.delete({
      where: { id: userId },
    });
  });
};

const refreshToken = async ({ refreshTokenValue }) => {
  let payload;

  try {
    payload = jwt.verify(refreshTokenValue, env.jwtRefreshSecret);
  } catch (error) {
    throw new HttpError(401, 'Refresh token is invalid or expired');
  }

  if (payload.tokenType !== 'refresh') {
    throw new HttpError(401, 'Invalid refresh token type');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      patient: true,
      doctor: true,
    },
  });

  if (!user || !user.refreshTokenHash || !user.refreshTokenExpiresAt) {
    throw new HttpError(401, 'Session is no longer valid');
  }

  if (user.refreshTokenExpiresAt.getTime() < Date.now()) {
    throw new HttpError(401, 'Refresh token has expired. Please login again');
  }

  const matchesStoredToken = await bcrypt.compare(
    refreshTokenValue,
    user.refreshTokenHash
  );

  if (!matchesStoredToken) {
    throw new HttpError(401, 'Session is no longer valid');
  }

  const tokens = await issueSessionTokens({ userId: user.id, role: user.role });

  return {
    user: mapUserResponse(user),
    ...tokens,
  };
};

const verifyEmail = async ({ token }) => {
  const verificationTokenHash = hashOpaqueToken(token);

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationTokenHash: verificationTokenHash,
      emailVerificationExpiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      isVerified: true,
    },
  });

  if (!user) {
    throw new HttpError(400, 'Invalid or expired email verification token');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    },
  });
};

const forgotPassword = async ({ email }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    return;
  }

  const resetToken = generateOpaqueToken();
  const resetTokenHash = hashOpaqueToken(resetToken);
  const resetTokenExpiresAt = getFutureDateFromDuration(
    `${env.resetPasswordTokenExpiresMinutes}m`,
    30 * 60 * 1000
  );

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: resetTokenHash,
      passwordResetExpiresAt: resetTokenExpiresAt,
    },
  });

  await sendResetPasswordEmail({
    email: user.email,
    token: resetToken,
  });
};

const resetPassword = async ({ token, password }) => {
  const resetTokenHash = hashOpaqueToken(token);

  const user = await prisma.user.findFirst({
    where: {
      passwordResetTokenHash: resetTokenHash,
      passwordResetExpiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new HttpError(400, 'Invalid or expired password reset token');
  }

  const hashedPassword = await bcrypt.hash(password, env.bcryptSaltRounds);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    },
  });
};

module.exports = {
  forgotPassword,
  getCurrentUser,
  login,
  deleteAccount,
  logout,
  refreshToken,
  registerDoctor,
  registerPatient,
  resetPassword,
  verifyEmail,
};

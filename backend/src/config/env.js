const dotenv = require('dotenv');

dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

const toList = (value, fallback = []) => {
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const port = toNumber(process.env.PORT, 4000);
const corsOrigins = toList(
  process.env.CORS_ORIGIN || process.env.CORS_ORIGINS,
  [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ]
);

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port,
  appBaseUrl: process.env.APP_BASE_URL || `http://localhost:${port}`,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  corsOrigins,
  corsOrigin: corsOrigins[0],
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'change_me_access_secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change_me_refresh_secret',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
  refreshTokenCookieName:
    process.env.REFRESH_TOKEN_COOKIE_NAME || 'tabibconnect_refresh_token',
  authRateLimitWindowMs: toNumber(
    process.env.RATE_LIMIT_AUTH_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  ),
  authRateLimitMax: toNumber(
    process.env.RATE_LIMIT_AUTH_MAX || process.env.RATE_LIMIT_MAX,
    5
  ),
  csrfSecret: process.env.CSRF_SECRET || 'change_me_csrf_secret',
  csrfCookieName: process.env.CSRF_COOKIE_NAME || 'tabibconnect_csrf_token',
  csrfHeaderName: process.env.CSRF_HEADER_NAME || 'x-csrf-token',
  emailVerificationTokenExpiresMinutes: toNumber(
    process.env.EMAIL_VERIFY_TOKEN_EXPIRES_MINUTES,
    24 * 60
  ),
  resetPasswordTokenExpiresMinutes: toNumber(
    process.env.RESET_PASSWORD_TOKEN_EXPIRES_MINUTES,
    30
  ),
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: toNumber(process.env.SMTP_PORT, 587),
  smtpSecure: toBoolean(process.env.SMTP_SECURE, false),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'TabibConnect <no-reply@tabibconnect.ma>',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioFrom: process.env.TWILIO_FROM || '',
  freeCancellationHours: toNumber(process.env.FREE_CANCELLATION_HOURS, 2),
  reminderHoursBefore: toNumber(process.env.REMINDER_HOURS_BEFORE, 24),
  reminderWindowMinutes: toNumber(process.env.REMINDER_WINDOW_MINUTES, 10),
  noShowGraceMinutes: toNumber(process.env.NO_SHOW_GRACE_MINUTES, 30),
  demoPatientEmail: process.env.DEMO_PATIENT_EMAIL || 'youssef.benali@tabibconnect.ma',
  uploadDocumentsDir: process.env.UPLOAD_DOCUMENTS_DIR || 'uploads/documents',
  cinVerificationEnabled: toBoolean(process.env.CIN_VERIFICATION_ENABLED, true),
  cinVerificationStrict: toBoolean(
    process.env.CIN_VERIFICATION_STRICT,
    process.env.NODE_ENV === 'production'
  ),
  cinVerificationMinScore: toNumber(process.env.CIN_VERIFICATION_MIN_SCORE, 3),
  cinVerificationKeywords: toList(
    process.env.CIN_VERIFICATION_KEYWORDS,
    ['carte', 'identite', 'nationale', 'royaume', 'maroc', 'cin']
  ),
  cinVerificationOcrLang: process.env.CIN_VERIFICATION_OCR_LANG || 'fra+ara',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  stripeCurrency: process.env.STRIPE_CURRENCY || 'mad',
};

module.exports = env;

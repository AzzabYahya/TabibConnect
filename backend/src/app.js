const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const homeRoutes = require('./routes/homeRoutes');
const searchRoutes = require('./routes/searchRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const cabinetRoutes = require('./routes/cabinetRoutes');
const healthRoutes = require('./routes/healthRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const userRoutes = require('./routes/userRoutes');
const patientRoutes = require('./routes/patientRoutes');
const ordonnancePublicRoutes = require('./routes/ordonnancePublicRoutes');
const errorHandler = require('./middlewares/errorHandler');
const { csrfErrorHandler, doubleCsrfProtection } = require('./middlewares/csrfProtection');
const sanitizeInputs = require('./middlewares/sanitizeInputs');

const app = express();

app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(408).json({ status: 'error', message: 'Request timeout' });
    }
  });
  next();
});

const isOriginAllowed = (origin) => {
  if (env.nodeEnv === 'production' && env.corsOrigins.includes('*')) {
    return false;
  }
  return (
    !origin ||
    env.corsOrigins.includes('*') ||
    env.corsOrigins.includes(origin)
  );
};

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://*.openstreetmap.org"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://*.stripe.com"],
      },
    },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', env.csrfHeaderName],
  })
);
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(doubleCsrfProtection);
app.use(sanitizeInputs);

app.use(
  '/uploads/ordonnances',
  express.static(path.resolve(process.cwd(), 'uploads', 'ordonnances'), {
    maxAge: '1d',
    fallthrough: false,
  })
);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/home', homeRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/cabinets', cabinetRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/ordonnance', ordonnancePublicRoutes);

app.use('/api/v1', healthRoutes);


app.use((req, res, next) => {
  const error = new Error('Route not found');
  error.statusCode = 404;
  next(error);
});

app.use(csrfErrorHandler);
app.use(errorHandler);

module.exports = app;

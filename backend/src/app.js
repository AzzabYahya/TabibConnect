const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const homeRoutes = require('./routes/homeRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const cabinetRoutes = require('./routes/cabinetRoutes');
const healthRoutes = require('./routes/healthRoutes');
const { csrfErrorHandler } = require('./middlewares/csrfProtection');
const errorHandler = require('./middlewares/errorHandler');
const sanitizeInputs = require('./middlewares/sanitizeInputs');

const app = express();

const isOriginAllowed = (origin) => {
  return (
    !origin ||
    env.corsOrigins.includes('*') ||
    env.corsOrigins.includes(origin)
  );
};

app.use(helmet());
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
app.use(sanitizeInputs);

app.use('/api/auth', authRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/cabinets', cabinetRoutes);

app.use('/api', healthRoutes);

app.use((req, res, next) => {
  const error = new Error('Route not found');
  error.statusCode = 404;
  next(error);
});

app.use(csrfErrorHandler);
app.use(errorHandler);

module.exports = app;

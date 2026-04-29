const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const app = require('./src/app');
const env = require('./src/config/env');
const { startAppointmentJobs } = require('./src/jobs/appointmentJobs');
const { setSocketServer } = require('./src/config/socket');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (
        !origin ||
        env.corsOrigins.includes('*') ||
        env.corsOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by Socket CORS'));
    },
    credentials: true,
  },
});

const getAccessTokenFromHandshake = (socket) => {
  const bearer = socket.handshake?.headers?.authorization;
  if (bearer && bearer.startsWith('Bearer ')) {
    return bearer.slice('Bearer '.length).trim();
  }

  const authToken = socket.handshake?.auth?.token;
  return typeof authToken === 'string' ? authToken.trim() : null;
};

io.use((socket, next) => {
  try {
    const token = getAccessTokenFromHandshake(socket);

    if (!token) {
      return next(new Error('Socket authentication token is required'));
    }

    const payload = jwt.verify(token, env.jwtAccessSecret);

    if (payload.tokenType !== 'access') {
      return next(new Error('Invalid socket authentication token type'));
    }

    socket.data.user = {
      id: payload.sub,
      role: payload.role,
    };

    return next();
  } catch (error) {
    return next(new Error('Invalid or expired socket authentication token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.data?.user?.id;

  if (userId) {
    socket.join(`user:${userId}`);
  }
});

setSocketServer(io);
startAppointmentJobs();

server.listen(env.port, () => {
  console.log(
    `TabibConnect backend listening on port ${env.port} (${env.nodeEnv})`
  );
});

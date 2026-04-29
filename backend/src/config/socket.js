let io;

const setSocketServer = (socketServer) => {
  io = socketServer;
};

const getSocketServer = () => io;

const emitToUser = (userId, eventName, payload) => {
  if (!io || !userId) {
    return;
  }

  io.to(`user:${userId}`).emit(eventName, payload);
};

module.exports = {
  emitToUser,
  getSocketServer,
  setSocketServer,
};

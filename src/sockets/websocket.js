const { verifyToken } = require("../services/jwt.service");

const userSocketMap = new Map();

let _io = null;

function initSocket(io) {
  _io = io;
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Parse cookie from handshake
    const cookieString = socket.handshake.headers.cookie;
    let token = null;
    if (cookieString) {
      const tokenMatch = cookieString.match(/(?:^|;\s*)token=([^;]*)/);
      if (tokenMatch) {
        token = tokenMatch[1];
      }
    }

    if (token) {
      const { valid, decoded, error } = verifyToken(token);
      if (valid) {
        const { id, balance, email, name } = decoded;
        const userData = { id, balance, email, name };
        userSocketMap.set(socket.id, userData);
        socket.user = userData;
        socket.emit("authenticated", userData);
        console.log(`Socket authenticated via cookie: ${name}`);
      } else {
        console.log("Invalid token in cookie");
        // Optional: socket.disconnect();
      }
    }

    // Keep manual auth for backward compatibility or if cookie fails?
    // User requested "fix login page... save to cookie".
    // I will keep manual auth listener just in case but update FE to not use it if possible.
    // Actually, if I update FE to not emit 'auth', this listener won't be called.
    socket.on("auth", (token) => {
      const { valid, decoded, error } = verifyToken(token);
      if (!valid) {
        socket.emit("error", { message: "Invalid token", error });
        return;
      }
      const { id, balance, email, name } = decoded;
      const userData = { id, balance, email, name };
      userSocketMap.set(socket.id, userData);
      socket.user = userData;
      socket.emit("authenticated", userData);
    });

    socket.on("disconnect", () => {
      userSocketMap.delete(socket.id);
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

function getIO() {
  return _io;
}

function emitToUser(userId, event, data) {
  if (!_io) return;
  for (const [socketId, userData] of userSocketMap.entries()) {
    if (userData.id === userId) {
      _io.to(socketId).emit(event, data);
    }
  }
}

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  userSocketMap,
};

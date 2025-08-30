const { verifyToken } = require("../services/jwt.service");

const userSocketMap = new Map();

let _io = null;

function initSocket(io) {
  _io = io;
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
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

module.exports = {
  initSocket,
  getIO,
  userSocketMap,
};

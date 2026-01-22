const { verifyToken } = require("../services/jwt.service");
const { db } = require("../configs/drizzle");
const { users } = require("../db/schema");
const { eq } = require("drizzle-orm");

const userSocketMap = new Map();

let _io = null;

// Helper: Get fresh balance from database
async function getFreshBalance(userId) {
  try {
    const [user] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, userId));
    return user?.balance ?? 0;
  } catch (error) {
    console.error("Failed to fetch balance from DB:", error);
    return 0;
  }
}

function initSocket(io) {
  _io = io;
  io.on("connection", async (socket) => {
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
        const { id, email, name } = decoded;

        // IMPORTANT: Fetch fresh balance from database, NOT from JWT token
        const freshBalance = await getFreshBalance(id);

        const userData = { id, balance: freshBalance, email, name };
        userSocketMap.set(socket.id, userData);
        socket.user = userData;
        socket.emit("authenticated", userData);
        console.log(`Socket authenticated via cookie: ${name}, balance: ${freshBalance}`);
      } else {
        console.log("Invalid token in cookie");
        // Optional: socket.disconnect();
      }
    }

    // Keep manual auth for backward compatibility
    socket.on("auth", async (token) => {
      const { valid, decoded, error } = verifyToken(token);
      if (!valid) {
        socket.emit("error", { message: "Invalid token", error });
        return;
      }
      const { id, email, name } = decoded;

      // Fetch fresh balance from database
      const freshBalance = await getFreshBalance(id);

      const userData = { id, balance: freshBalance, email, name };
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
  if (!_io) {
    console.log("❌ Socket IO not initialized when trying to emit", event);
    return;
  }
  let sent = false;
  for (const [socketId, userData] of userSocketMap.entries()) {
    if (userData.id == userId) { // Use loose equality for safety
      _io.to(socketId).emit(event, data);
      console.log(`✅ Emitted '${event}' to socket ${socketId} for userId ${userId}`);
      sent = true;
    }
  }
  if (!sent) {
    console.log(`⚠️ User ${userId} not connected or no socket found. Map size: ${userSocketMap.size}`);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  userSocketMap,
};

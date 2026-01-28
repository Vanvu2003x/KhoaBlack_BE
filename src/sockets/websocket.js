const { verifyToken } = require("../services/jwt.service");
const { db } = require("../configs/drizzle");
const { users } = require("../db/schema");
const { eq } = require("drizzle-orm");

// Map: socketId -> userData
const userSocketMap = new Map();
// Map: userId -> Set of socketIds (để track multiple tabs/devices)
const userIdToSockets = new Map();

let _io = null;

// Helper: Track socket by userId
function trackSocket(socketId, userId) {
  if (!userIdToSockets.has(userId)) {
    userIdToSockets.set(userId, new Set());
  }
  userIdToSockets.get(userId).add(socketId);
}

// Helper: Untrack socket when disconnected
function untrackSocket(socketId, userId) {
  if (userId && userIdToSockets.has(userId)) {
    userIdToSockets.get(userId).delete(socketId);
    if (userIdToSockets.get(userId).size === 0) {
      userIdToSockets.delete(userId);
    }
  }
}

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
        trackSocket(socket.id, id); // Track này để emit tới user dễ hơn
        socket.user = userData;
        socket.emit("authenticated", userData);
        console.log(`✅ Socket authenticated via cookie: ${name} (userId: ${id}), balance: ${freshBalance}`);
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
      trackSocket(socket.id, id);
      socket.user = userData;
      socket.emit("authenticated", userData);
      console.log(`✅ Socket authenticated via manual auth: ${name} (userId: ${id})`);
    });

    socket.on("disconnect", () => {
      const userData = userSocketMap.get(socket.id);
      if (userData) {
        untrackSocket(socket.id, userData.id);
      }
      userSocketMap.delete(socket.id);
      console.log(`🔌 Socket disconnected: ${socket.id}`);
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

  // ✅ Optimized: O(1) lookup instead of O(N) loop
  if (userIdToSockets.has(userId)) {
    const socketIds = userIdToSockets.get(userId);
    let sent = false;

    for (const socketId of socketIds) {
      // Check if socket is still connected/in map just to be safe
      if (userSocketMap.has(socketId)) {
        _io.to(socketId).emit(event, data);
        sent = true;
      }
    }

    if (sent) {
      console.log(`✅ Emitted '${event}' to user ${userId} (Sockets: ${Array.from(socketIds).join(', ')})`);
    } else {
      console.log(`⚠️ User ${userId} has tracked sockets but they appear inactive.`);
    }
  } else {
    // console.log(`ℹ️ User ${userId} is not currently connected.`);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  userSocketMap,
};

require("dotenv").config();
const app = require('./app');
const http = require("http");
const { Server } = require("socket.io");
const { initSocket } = require("./sockets/websocket");
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Socket.IO CORS configuration
// SOCKET_ORIGINS can be comma-separated list: "http://localhost:3000,https://khoablacktopup.vn"
const getAllowedOrigins = () => {
  const originsEnv = process.env.SOCKET_ORIGINS;
  if (originsEnv) {
    const origins = originsEnv.split(',').map(o => o.trim()).filter(Boolean);
    console.log("🔧 SOCKET_ORIGINS từ env:", origins);
    return origins;
  }
  // Fallback: allow all in development, or use FRONTEND_URL if set
  if (process.env.NODE_ENV === 'production') {
    if (process.env.FRONTEND_URL) {
      console.log("🔧 Sử dụng FRONTEND_URL làm socket origin:", process.env.FRONTEND_URL);
      return [process.env.FRONTEND_URL];
    }
    console.warn("⚠️ Production mode nhưng không có SOCKET_ORIGINS hoặc FRONTEND_URL!");
  }
  return true; // Allow all origins in development
};

console.log("🔧 NODE_ENV:", process.env.NODE_ENV || "development");
const allowedOrigins = getAllowedOrigins();
console.log("🔌 Socket.IO allowed origins:", allowedOrigins);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  // Ping timeout and interval for connection stability
  pingTimeout: 60000,
  pingInterval: 25000
});

initSocket(io);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.IO ready on same port: ${PORT}`);
});

// Background Job: Auto-fail pending transactions > 20 mins
const WalletLogService = require("./modules/walletLog/walletLog.service");
setInterval(() => {
  WalletLogService.autoCheckExpiredTransactions();
}, 20 * 60 * 1000); // Check every 20 minutes

// ✅ Initialize Cron Jobs
const { initCronJobs } = require('./services/cron.service');
initCronJobs();



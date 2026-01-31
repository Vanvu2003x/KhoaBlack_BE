const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const cookieParser = require('cookie-parser');

const paymentRoutes = require('./modules/payment/payment.route.js');
const authroute = require('./modules/auth/auth.route.js');
const gamesRoute = require('./modules/game/game.route.js');
const topup_wallet_logsRoute = require("./modules/walletLog/walletLog.route.js");
const toup_packageRoute = require("./modules/package/package.route.js");
const orderRoute = require("./modules/order/order.route.js");
const webhook = require('./routes/webhooks.route.js');
const userRoute = require("./modules/user/user.route.js")
const accRoute = require("./modules/acc/acc.route.js")
const accOrdersRoute = require('./modules/acc/accOrder.route.js')
const app = express();

// CORS Configuration - Read from env or use defaults
const getAllowedOrigins = () => {
  const originsEnv = process.env.CORS_ORIGINS;
  if (originsEnv) {
    return originsEnv.split(',').map(o => o.trim());
  }
  // Fallback defaults
  return [
    "http://localhost:3000",
    "https://khoablacktopup.vn",
    "https://www.khoablacktopup.vn",
    "http://khoablacktopup.vn",
    "http://www.khoablacktopup.vn"
  ];
};

const corsOptions = {
  origin: getAllowedOrigins(),
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly (before any other middleware)
app.options('*', cors(corsOptions));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
})); // Security headers
app.use(cookieParser());

app.use(express.json());

// ✅ Rate Limiting (skip OPTIONS requests)
const { generalLimiter } = require('./middleware/rateLimit.middleware');
app.use('/api', (req, res, next) => {
  if (req.method === 'OPTIONS') return next(); // Skip rate limit for preflight
  generalLimiter(req, res, next);
});

// ✅ Static file
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Các route
// ✅ Các route
app.use('/api/order', orderRoute);
app.use('/api/toup-wallet-log', topup_wallet_logsRoute);
app.use('/api/games', gamesRoute);
app.use('/api/payment', paymentRoutes);
app.use('/api/statistics', require('./modules/statistics/statistics.route.js'));

// Auth & User routes - Merged logic or separate?
// FE calls /api/users for both auth and user info.
app.use('/api/users', authroute);
app.use('/api/users', userRoute);

// FE calls /api/user/balance...
// We can mount a specific router for /api/user or reuse userRoute if it has the paths
app.use('/api/user', userRoute); // For /balance endpoints if defined there
app.use('/api/user', authroute); // For /balance/send-otp if defined there?

app.use('/webhook', webhook);
app.use('/api/toup-package', toup_packageRoute);
app.use('/api/acc', accRoute);
app.use('/api/accOrder', accOrdersRoute);
app.use('/api/morishop', require('./modules/morishop/morishop.route.js'));
app.use('/api/tools', require('./modules/toolsgame/toolsgame.route.js'));

// Error Handling Middleware
const errorMiddleware = require('./middleware/error.middleware');
app.use(errorMiddleware);

module.exports = app;

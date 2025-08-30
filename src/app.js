const express = require('express');
const cors = require('cors');
const path = require('path');

const paymentRoutes = require('./routes/api/payment.route.js');
const authroute = require('./routes/api/auth.route.js');
const gamesRoute = require('./routes/api/games.route.js');
const topup_wallet_logsRoute = require("./routes/api/ToUpWalletLog.route.js");
const toup_packageRoute = require("./routes/api/toupPackage.route.js");
const orderRoute = require("./routes/api/order.route.js");
const webhook = require('./routes/webhooks.route.js');
const userRoute = require("./routes/api/user.route.js")
const accRoute = require("./routes/api/acc.route.js")
const accOrdersRoute = require('./routes/api/accOrder.route.js')
const app = express();

const corsOptions = {
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: false
};

app.use(cors(corsOptions));

app.use(express.json());

// ✅ Static file
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Các route
app.use('/api/order', orderRoute);
app.use('/api/toup-wallet-log', topup_wallet_logsRoute);
app.use('/api/games', gamesRoute);
app.use('/api/payment', paymentRoutes);
app.use('/api/users', authroute);
app.use('/webhook', webhook);
app.use('/api/toup-package', toup_packageRoute);
app.use('/api/user', userRoute)
app.use('/api/acc',accRoute)
app.use('/api/accOrder',accOrdersRoute)

module.exports = app;

const express = require('express');
const paymentRoutes = require('./routes/payment.route.js');
const rechange_gameroute = require("./routes/list_rechange_game_uid.route.js")
const gamesroute = require("./routes/games.route.js")
const payosroute = require("./routes/payos.route.js")
const userroute = require('./routes/auth.route.js')
const cors = require('cors');
const app = express();
const testroute = require('./routes/test.route.js');

app.use(cors());              
app.use(express.json());      
app.use('/testotp',testroute)
app.use('/payos',payosroute)
app.use('/payment',paymentRoutes)
app.use('/api/game', gamesroute)
app.use('/api/recharge-package', rechange_gameroute)
app.use('/api/users',userroute)
app.get('/', (req, res) => {
  res.send('Welcome to backend!');
});
module.exports = app;

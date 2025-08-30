require("dotenv").config();
const app = require('./app');
const http = require("http");
const { Server } = require("socket.io");
const { initSocket } = require("./sockets/websocket");
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);  
const io = new Server(server, {
  cors: {
    origin: "*",  
    methods: ["GET", "POST"]
  }
});

initSocket(io);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

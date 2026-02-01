const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let onlineUsers = {}; // userId -> socketId

io.on("connection", (socket) => {
  console.log("User connected", socket.id);

  // Register user when they log in
  socket.on("register", (userId) => {
    onlineUsers[userId] = socket.id;
  });

  // Disconnect
  socket.on("disconnect", () => {
    for (let userId in onlineUsers) {
      if (onlineUsers[userId] === socket.id) {
        delete onlineUsers[userId];
      }
    }
    console.log("User disconnected", socket.id);
  });
});

module.exports = { io, server };

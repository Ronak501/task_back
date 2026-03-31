const { Server } = require("socket.io");

const GeneralMessage = require("../models/generalMessage");
const TaskMessage = require("../models/taskMessage");

let ioInstance;

function initSocket(server) {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  const taskRooms = new Map();

  ioInstance.on("connection", (socket) => {
    socket.on("join", async (username) => {
      socket.username = username;
      try {
        const messages = await GeneralMessage.find().sort({ timestamp: 1 });
        socket.emit("chatHistory", messages);
      } catch (err) {
        console.error("Error fetching general chat history:", err.message);
      }
    });

    socket.on("message", async (data) => {
      try {
        const message = new GeneralMessage({
          from: data.from,
          content: data.content,
          timestamp: new Date(),
          time:
            data.time ||
            new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
        });
        await message.save();
        ioInstance.emit("message", message);
      } catch (err) {
        console.error("Error saving general message:", err.message);
      }
    });

    socket.on("joinTaskRoom", async (taskName, workerName) => {
      socket.username = workerName;
      socket.taskName = taskName;

      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.leave(room);
        }
      });

      socket.join(taskName);
      if (!taskRooms.has(taskName)) {
        taskRooms.set(taskName, new Set());
      }
      taskRooms.get(taskName).add(workerName);
      ioInstance
        .to(taskName)
        .emit("roomUsers", Array.from(taskRooms.get(taskName)));

      try {
        const messages = await TaskMessage.find({ taskName }).sort({
          timestamp: 1,
        });
        socket.emit("taskChatHistory", messages);
      } catch (err) {
        console.error("Error fetching task chat history:", err.message);
      }
    });

    socket.on("taskMessage", async (data) => {
      try {
        const message = new TaskMessage({
          taskName: data.taskName,
          from: data.from,
          content: data.content,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          timestamp: new Date(),
          time: data.time || new Date().toLocaleTimeString(),
        });
        await message.save();
        ioInstance.to(data.taskName).emit("taskMessage", message);
      } catch (err) {
        console.error("Error saving task message:", err.message);
      }
    });

    socket.on("disconnect", () => {
      taskRooms.forEach((users, taskName) => {
        users.delete(socket.username);
        if (users.size === 0) {
          taskRooms.delete(taskName);
        } else {
          ioInstance.to(taskName).emit("roomUsers", Array.from(users));
        }
      });
    });
  });

  return ioInstance;
}

module.exports = { initSocket };

const mongoose = require("mongoose");

const taskMessageSchema = new mongoose.Schema({
  taskName: { type: String, required: true },
  from: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  time: { type: String },
  fileUrl: { type: String },
  fileName: { type: String },
});

module.exports = mongoose.model("TaskMessage", taskMessageSchema);

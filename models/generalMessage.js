const mongoose = require("mongoose");

const generalMessageSchema = new mongoose.Schema({
  from: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  time: { type: String },
});

module.exports = mongoose.model("GeneralMessage", generalMessageSchema);

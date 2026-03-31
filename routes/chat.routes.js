const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

const taskforworker = require("../models/taskforworker");

const router = express.Router();

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

router.post("/api/validate-task-access", async (req, res) => {
  const { workerName, taskName, role } = req.body;

  if (!workerName || !taskName) {
    return res
      .status(400)
      .json({ error: "Worker name and task name are required" });
  }

  const safeRole = role || "User";

  try {
    let task;

    if (safeRole.includes("Director")) {
      task = await taskforworker.findOne({ task: taskName });
    } else if (safeRole.includes("Associate")) {
      task = await taskforworker.findOne({
        task: taskName,
        workers: workerName,
      });
    } else if (safeRole.includes("TeamLead")) {
      task = await taskforworker.findOne({ task: taskName, name: workerName });
    }

    if (!task) {
      return res
        .status(403)
        .json({ valid: false, error: "Access denied to this task" });
    }

    return res.json({
      valid: true,
      task: {
        name: task.name,
        task: task.task,
        workers: task.workers,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Server error", details: error.message });
  }
});

router.get("/api/get-task/:taskName", async (req, res) => {
  const { taskName } = req.params;

  try {
    const task = await taskforworker.findOne({ task: taskName });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    return res.json({ task });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Server error", details: error.message });
  }
});

router.get("/api/get-all-tasks", async (req, res) => {
  try {
    const tasks = await taskforworker.find({}, "task");
    const taskNames = tasks.map((taskItem) => taskItem.task);
    return res.json({ taskNames });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Server error", details: error.message });
  }
});

router.get("/api/search-tasks", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.trim() === "") {
      return res.json({ data: [] });
    }

    const regex = new RegExp(`^${query.trim()}`, "i");
    const tasks = await taskforworker
      .find({ task: regex })
      .select("task -_id")
      .limit(10);
    return res.json({ data: tasks.map((taskItem) => taskItem.task) });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

router.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  return res.json({ fileUrl: `/uploads/${req.file.filename}` });
});

module.exports = router;

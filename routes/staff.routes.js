const express = require("express");

const user = require("../models/user");
const manager = require("../models/manager");

const router = express.Router();

router.get("/getman", async function (req, res) {
  try {
    const data = await user.find({ role: "TeamLead" });
    return res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

router.get("/manageralldetail", async function (req, res) {
  try {
    const managers = await manager.find({}, "username role");
    const combinedData = managers.map((m) => ({
      name: m.username,
      role: m.role,
      email: m.email,
      _id: m._id,
      mobile: m.mobile,
    }));

    return res.status(200).json({
      status: "done",
      data: combinedData,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch manager details",
    });
  }
});

router.delete("/removemanager/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedManager = await manager.findByIdAndDelete(id);

    if (!deletedManager) {
      return res
        .status(404)
        .json({ success: false, message: "Manager not found" });
    }

    return res.json({ success: true, message: "Manager removed successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/getwor", async function (req, res) {
  try {
    const data = await user.find({ role: "Associate" });
    return res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

router.delete("/removeworker/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedWorker = await user.findByIdAndDelete(id);

    if (!deletedWorker) {
      return res
        .status(404)
        .json({ success: false, message: "Worker not found" });
    }

    return res.json({ success: true, message: "Worker removed successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;

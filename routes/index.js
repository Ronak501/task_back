const express = require("express");

const rootRoutes = require("./root.routes");
const authRoutes = require("./auth.routes");
const taskRoutes = require("./task.routes");
const staffRoutes = require("./staff.routes");
const chatRoutes = require("./chat.routes");

const router = express.Router();

router.use(rootRoutes);
router.use(authRoutes);
router.use(taskRoutes);
router.use(staffRoutes);
router.use(chatRoutes);

module.exports = router;

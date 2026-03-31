const express = require("express");
const mongoose = require("mongoose");

const user = require("../models/user");
const task = require("../models/task");
const taskforworker = require("../models/taskforworker");

const router = express.Router();

router.patch("/updatetaskstatus/:id", async (req, res) => {
  try {
    const { id: taskId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid task ID format.",
      });
    }

    const taskExists = await taskforworker.findById(taskId);
    if (!taskExists) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!status) {
      return res.status(400).json({
        status: "error",
        message: "Status is required",
      });
    }

    const updatedTask = await taskforworker.findByIdAndUpdate(
      taskId,
      { $set: { status: status } },
      { new: true, runValidators: true },
    );

    if (!updatedTask) {
      return res.status(404).json({
        status: "error",
        message: "Task not found",
      });
    }

    return res.status(200).json({
      status: "done",
      message: "Task status updated successfully",
      task: updatedTask,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
});

router.patch("/updatetaskaction/:id", async (req, res) => {
  try {
    const taskId = req.params.id;
    const { nameofworker, actions } = req.body;

    if (!["accepted", "declined"].includes(actions)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid Actions. Use 'accepted' or 'declined'.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid task ID format.",
      });
    }

    const taskExists = await taskforworker.findById(taskId);
    if (!taskExists) {
      return res.status(404).json({
        status: "error",
        message: "Task not found.",
      });
    }

    const updatedTask = await taskforworker.findOneAndUpdate(
      { _id: taskId, "actionStatuses.worker": nameofworker },
      { $set: { "actionStatuses.$.actions": actions } },
      { new: true, runValidators: true },
    );

    if (!updatedTask) {
      const newEntry = await taskforworker.findOneAndUpdate(
        { _id: taskId },
        {
          $push: { actionStatuses: { worker: nameofworker, actions: actions } },
        },
        { new: true, runValidators: true },
      );

      if (!newEntry) {
        return res.status(404).json({
          status: "error",
          message: "Task not found or worker action could not be updated.",
        });
      }

      return res.status(200).json({
        status: "success",
        message: `Task action added as '${actions}' successfully.`,
        task: newEntry,
      });
    }

    return res.status(200).json({
      status: "success",
      message: `Task action updated to '${actions}' successfully.`,
      task: updatedTask,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "An unexpected error occurred.",
      error: err.message,
    });
  }
});

router.patch("/updatetaskmanageraction/:id", async (req, res) => {
  try {
    const taskId = req.params.id;
    const { actions } = req.body;

    if (!["accepted", "declined"].includes(actions)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid Actions. Use 'accepted' or 'declined'.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid task ID format.",
      });
    }

    const taskExists = await task.findById(taskId);
    if (!taskExists) {
      return res.status(404).json({
        status: "error",
        message: "Task not found.",
      });
    }

    const updatedTask = await task.findByIdAndUpdate(
      taskId,
      { $set: { manageraction: actions } },
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      status: "success",
      message: `Manager action updated to '${actions}' successfully.`,
      task: updatedTask,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "An unexpected error occurred.",
      error: err.message,
    });
  }
});

router.patch("/updatetaskmsg/:id", async (req, res) => {
  try {
    const { id: taskId } = req.params;
    const { msg, actions, date } = req.body;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid task ID format.",
      });
    }

    if (!msg) {
      return res.status(400).json({
        status: "error",
        message: "Message field cannot be empty.",
      });
    }

    const taskExists = await task.findById(taskId);
    if (!taskExists) {
      return res.status(404).json({
        status: "error",
        message: "Task not found.",
      });
    }

    const updatedTask = await task.findByIdAndUpdate(
      taskId,
      {
        $set: {
          managerdeclinemsg: msg,
          manageraction: actions,
          declinedate: date,
        },
      },
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      status: "success",
      message: "Manager decline message updated successfully.",
      task: updatedTask,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "An unexpected error occurred.",
      error: err.message,
    });
  }
});

router.patch("/redeclaretask/:id", async (req, res) => {
  const { id } = req.params;
  const { managerName } = req.body;

  try {
    const existingTask = await task.findById(id);
    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    const updatedTask = await task.findByIdAndUpdate(
      id,
      {
        $set: {
          manageraction: "initiated",
          rejectedDate: new Date().toISOString().split("T")[0],
          name: managerName,
        },
      },
      { new: true, runValidators: true },
    );

    return res.json({
      message: "Task successfully redeclared",
      task: updatedTask,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error redeclaring task", error });
  }
});

router.patch("/updateworkertaskmsg/:id", async (req, res) => {
  try {
    const taskId = req.params.id;
    const { nameofworker, msg, actions, date } = req.body;

    if (actions !== "declined") {
      return res.status(400).json({
        status: "error",
        message: "Invalid action. Use 'declined'.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid task ID format.",
      });
    }

    if (!msg || msg.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Decline reason (msg) is required.",
      });
    }

    const taskExists = await taskforworker.findById(taskId);
    if (!taskExists) {
      return res.status(404).json({
        status: "error",
        message: "Task not found.",
      });
    }

    const updatedTask = await taskforworker.findOneAndUpdate(
      { _id: taskId, "actionStatuses.worker": nameofworker },
      {
        $set: {
          "actionStatuses.$.actions": actions,
          "actionStatuses.$.msg": msg,
          "actionStatuses.$.date": date,
        },
      },
      { new: true, runValidators: true },
    );

    if (!updatedTask) {
      const newEntry = await taskforworker.findByIdAndUpdate(
        taskId,
        {
          $push: {
            actionStatuses: {
              worker: nameofworker,
              actions: actions,
              msg: msg,
              date: date,
            },
          },
        },
        { new: true, runValidators: true },
      );

      if (!newEntry) {
        return res.status(404).json({
          status: "error",
          message: "Task not found or worker action could not be updated.",
        });
      }

      return res.status(200).json({
        status: "success",
        message: `Task action marked as '${actions}' successfully.`,
        task: newEntry,
      });
    }

    return res.status(200).json({
      status: "success",
      message: `Task action updated to '${actions}' successfully.`,
      task: updatedTask,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "An unexpected error occurred.",
      error: err.message,
    });
  }
});

router.patch("/redeclareworkertask/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { workerName } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid task ID format." });
    }

    const existingTask = await taskforworker.findById(id);
    if (!existingTask) {
      return res
        .status(404)
        .json({ status: "error", message: "Task not found." });
    }

    const updatedTask = await taskforworker.findByIdAndUpdate(
      id,
      {
        $set: {
          "actionStatuses.$[elem].actions": "initiated",
          "actionStatuses.$[elem].msg": "",
          "actionStatuses.$[elem].date": "",
          "actionStatuses.$[elem].worker": workerName,
          workers: [workerName],
        },
      },
      {
        new: true,
        runValidators: true,
        arrayFilters: [{ "elem.worker": existingTask.workers[0] }],
      },
    );

    return res.status(200).json({
      status: "success",
      message: "Task successfully redeclared.",
      task: updatedTask,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "An unexpected error occurred.",
      error: err.message,
    });
  }
});

router.patch("/changestatus/:id", async (req, res) => {
  try {
    const taskId = req.params.id;
    const { mainstatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid task ID format.",
      });
    }

    const taskExists = await task.findById(taskId);
    if (!taskExists) {
      return res.status(404).json({
        status: "error",
        message: "Task not found.",
      });
    }

    const updatedTask = await task.findByIdAndUpdate(
      taskId,
      { $set: { mainstatus } },
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      status: "done",
      message: "Task status updated successfully.",
      task: updatedTask,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "An unexpected error occurred.",
      error: err.message,
    });
  }
});

router.patch("/updatetask/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid task ID format." });
    }

    const taskExists = await task.findById(id);
    if (!taskExists) {
      return res
        .status(404)
        .json({ status: "error", message: "Task not found." });
    }

    if (updateFields.name !== taskExists.name) {
      updateFields.manageraction = "initiated";
    }

    const updatedTask = await task.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true },
    );

    if (!updatedTask) {
      return res
        .status(404)
        .json({ status: "error", message: "Task not found" });
    }

    return res.json({
      status: "done",
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

router.delete("/deletetask/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid task ID format." });
    }

    const deletedTask = await task.findByIdAndDelete(id);

    if (!deletedTask) {
      return res
        .status(404)
        .json({ status: "error", message: "Task not found" });
    }

    return res.json({
      status: "done",
      message: "Task deleted successfully",
      task: deletedTask,
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

router.patch("/updateworkertask/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const updateData = req.body;

    const updatedTask = await taskforworker.findByIdAndUpdate(
      taskId,
      { $set: updateData },
      { new: true },
    );

    if (!updatedTask) {
      return res
        .status(404)
        .json({ status: "error", message: "Task not found" });
    }

    return res.status(200).json({ status: "success", data: updatedTask });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Failed to update task" });
  }
});

router.delete("/deleteworkertask/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid task ID format." });
    }

    const deletedTask = await taskforworker.findByIdAndDelete(id);

    if (!deletedTask) {
      return res
        .status(404)
        .json({ status: "error", message: "Task not found" });
    }

    return res.json({
      status: "done",
      message: "Task deleted successfully",
      task: deletedTask,
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

router.get("/taskalldetail", async function (req, res) {
  try {
    const tasks = await task.find();
    const taskIds = tasks.map((t) => t._id);

    const taskForWorker = await taskforworker.find({
      taskid: { $in: taskIds },
    });

    const combinedData = tasks.map((t) => ({
      ...t.toObject(),
      taskforworker_details: taskForWorker.filter((w) =>
        w.taskid.equals(t._id),
      ),
    }));

    return res.status(200).json({
      status: "done",
      data: combinedData,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch task details",
    });
  }
});

router.get("/taskforworkerdetail", async function (req, res) {
  try {
    const tasks = await taskforworker.find();
    return res.status(200).json({
      status: "done",
      data: tasks,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch task details",
    });
  }
});

router.post("/addtaskforworker", async function (req, res) {
  try {
    const {
      taskid,
      name,
      task: taskName,
      detail,
      assigndate,
      duedate,
      workers,
      priority,
      status,
    } = req.body;

    const findtaskname = await taskforworker.findOne({ task: taskName });
    if (findtaskname) {
      return res.status(400).json({
        status: "error",
        message: "Task Name already exists",
      });
    }

    const assignor = await user.findOne({ username: name });
    const alldata = await user.find();
    const validWorkerNames = alldata.map((worker) => worker.username);
    const invalidWorkers = workers.filter(
      (workerName) => !validWorkerNames.includes(workerName),
    );

    if (invalidWorkers.length > 0) {
      return res.status(400).json({
        status: "error",
        message: `The following workers do not exist: ${invalidWorkers.join(", ")}`,
      });
    }

    if (
      !taskid ||
      !name ||
      !taskName ||
      !assigndate ||
      !duedate ||
      !workers ||
      !priority ||
      !detail
    ) {
      return res.status(400).json({
        status: "error",
        message: "All fields are required",
      });
    }

    if (!assignor) {
      return res.status(404).json({
        status: "error",
        message: `Assignor '${name}' does not exist`,
      });
    }

    const actions = "initiated";

    const newTask = await taskforworker.create({
      taskid,
      name,
      task: taskName,
      assigndate,
      duedate,
      workers,
      actions,
      priority,
      detail,
      status,
    });

    return res.status(200).json({
      status: "done",
      message: "Task added successfully",
      task: newTask,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "An unexpected error occurred",
    });
  }
});

router.post("/gettaskforworker", async function (req, res) {
  try {
    const data = await taskforworker.find({ workers: req.body.name });
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

router.post("/getpertitask/:id", async function (req, res) {
  try {
    const data = await task.findById(req.params.id);
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

router.post("/gettask", async function (req, res) {
  try {
    const data = await task.find({ name: req.body.name });
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

router.post("/addtask", async (req, res) => {
  try {
    const worker = await user.findOne({ username: req.body.name });

    if (!worker) {
      return res.status(404).json({
        status: "error",
        message: "This worker does not exist",
      });
    }

    const newTask = await task.create({
      name: req.body.name,
      description: req.body.description,
      priority: req.body.priority,
      task: req.body.task,
      assigndate: req.body.assigndate,
      detail: req.body.detail,
      taskassigner: req.body.taskassigner,
      duedate: req.body.duedate,
      manageraction: req.body.manageraction || "initiated",
      mainstatus: req.body.mainstatus,
      managerdeclinemsg: req.body.managerdeclinemsg || "",
      declinedate: req.body.declinedate || "",
      role: req.body.role,
    });

    return res.status(201).json({
      status: "done",
      task: newTask,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

module.exports = router;

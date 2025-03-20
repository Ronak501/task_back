var express = require('express');
var router = express.Router();
const user = require("../models/user");
const task = require("../models/task");
const taskforworker = require("../models/taskforworker");
const bcrypt = require('bcrypt');
const mongoose = require("mongoose");
const manager = require("../models/manager");

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

// Route to update task status
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

    console.log("🔹 Received Request:", { taskId, status });

    if (!status) {
      return res.status(400).json({
        status: "error",
        message: "Status is required",
      });
    }

    const updatedTask = await taskforworker.findByIdAndUpdate(
      taskId,
      { $set: { status: status } },
      { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({
        status: "error",
        message: "Task not found",
      });
    }

    res.status(200).json({
      status: "done",
      message: "Task status updated successfully",
      task: updatedTask,
    });
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
});

// PATCH: Update Task Action
router.patch("/updatetaskaction/:id", async (req, res) => {
  try {
    const taskId = req.params.id;
    const { nameofworker, actions } = req.body;

    console.log("🔹 Received Request:", { taskId, nameofworker, actions });

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
      console.log("❌ Task not found in DB");
      return res.status(404).json({
        status: "error",
        message: "Task not found.",
      });
    }

    console.log("✅ Task Found:", taskExists);

    const updatedTask = await taskforworker.findOneAndUpdate(
      { _id: taskId, "actionStatuses.worker": nameofworker },
      { $set: { "actionStatuses.$.actions": actions } },
      { new: true, runValidators: true }
    );

    // If the update didn't find a match, add a new entry
    if (!updatedTask) {
      console.log("🔹 No existing worker action found, adding new entry...");

      const newEntry = await taskforworker.findOneAndUpdate(
        { _id: taskId },
        {
          $push: { actionStatuses: { worker: nameofworker, actions: actions } },
        },
        { new: true, runValidators: true }
      );

      if (!newEntry) {
        console.log("❌ Still couldn't update task.");
        return res.status(404).json({
          status: "error",
          message: "Task not found or worker action could not be updated.",
        });
      }

      console.log("✅ Worker action added successfully:", newEntry);
      return res.status(200).json({
        status: "success",
        message: `Task action added as '${actions}' successfully.`,
        task: newEntry,
      });
    }

    console.log("✅ Task Updated Successfully:", updatedTask);
    res.status(200).json({
      status: "success",
      message: `Task action updated to '${actions}' successfully.`,
      task: updatedTask,
    });
  } catch (err) {
    console.error("❌ Error Details:", err.message, err.stack);
    res.status(500).json({
      status: "error",
      message: "An unexpected error occurred.",
      error: err.message,
    });
  }
});

router.patch("/updatetaskmanageraction/:id", async (req, res) => {
  try {
    const taskId = req.params.id;
    const { nameofworker, actions } = req.body;

    console.log("🔹 Received Request:", { taskId, nameofworker, actions });

    // ✅ Validate action input
    if (!["accepted", "declined"].includes(actions)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid Actions. Use 'accepted' or 'declined'.",
      });
    }

    // ✅ Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid task ID format.",
      });
    }

    // ✅ Check if task exists
    const taskExists = await task.findById(taskId);
    if (!taskExists) {
      console.log("❌ Task not found in DB");
      return res.status(404).json({
        status: "error",
        message: "Task not found.",
      });
    }

    console.log("✅ Task Found:", taskExists);

    // ✅ Update `manageraction` field
    const updatedTask = await task.findByIdAndUpdate(
      taskId,
      { $set: { manageraction: actions } },
      { new: true, runValidators: true }
    );

    console.log("✅ Task Updated Successfully:", updatedTask);

    return res.status(200).json({
      status: "success",
      message: `Manager action updated to '${actions}' successfully.`,
      task: updatedTask,
    });
  } catch (err) {
    console.error("❌ Error Details:", err.message, err.stack);
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
    const { nameofworker, msg, actions, date } = req.body;

    console.log("🔹 Received Request:", { taskId, nameofworker, msg, actions, date });

    // ✅ Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid task ID format.",
      });
    }

    // ✅ Validate input fields
    if (!msg) {
      return res.status(400).json({
        status: "error",
        message: "Message field cannot be empty.",
      });
    }

    // ✅ Check if task exists
    const taskExists = await task.findById(taskId);
    if (!taskExists) {
      console.log("❌ Task not found in DB");
      return res.status(404).json({
        status: "error",
        message: "Task not found.",
      });
    }

    console.log("✅ Task Found:", taskExists);

    // ✅ Update `managerdeclinemsg` field
    const updatedTask = await task.findByIdAndUpdate(
      taskId,
      { $set: { managerdeclinemsg: msg, manageraction: actions, declinedate: date } },
      { new: true, runValidators: true }
    );

    console.log("✅ Task Updated Successfully:", updatedTask);

    return res.status(200).json({
      status: "success",
      message: `Manager decline message updated successfully.`,
      task: updatedTask,
    });
  } catch (err) {
    console.error("❌ Error Details:", err.message, err.stack);
    return res.status(500).json({
      status: "error",
      message: "An unexpected error occurred.",
      error: err.message,
    });
  }
});

router.patch("/redeclaretask/:id", async (req, res) => {
  const { id } = req.params;
  const { managerName } = req.body; // Get manager name from request body

  try {
    // Find the task by ID
    const existingTask = await task.findById(id);
    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Update the task with the new Manager Name and other changes
    const updatedTask = await task.findByIdAndUpdate(
      id,
      {
        $set: {
          manageraction: "initiated",
          rejectedDate: new Date().toISOString().split("T")[0],
          name: managerName, // Update the task name with the new Manager Name
        },
      },
      { new: true, runValidators: true }
    );

    // Respond with updated task
    res.json({ message: "Task successfully redeclared", task: updatedTask });
  } catch (error) {
    console.error("Error redeclaring task:", error);
    res.status(500).json({ message: "Error redeclaring task", error });
  }
});

router.patch("/updateworkertaskmsg/:id", async (req, res) => {
  try {
    const taskId = req.params.id;
    const { nameofworker, msg, actions, date } = req.body;

    console.log("🔹 Received Request:", {
      taskId,
      nameofworker,
      actions,
      msg,
      date,
    });

    // Validate that the action is 'declined'
    if (actions !== "declined") {
      return res.status(400).json({
        status: "error",
        message: "Invalid action. Use 'declined'.",
      });
    }

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid task ID format.",
      });
    }

    // Ensure msg is provided
    if (!msg || msg.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Decline reason (msg) is required.",
      });
    }

    // Check if the task exists
    const taskExists = await taskforworker.findById(taskId);
    if (!taskExists) {
      console.log("❌ Task not found in DB");
      return res.status(404).json({
        status: "error",
        message: "Task not found.",
      });
    }

    console.log("✅ Task Found:", taskExists);

    // Update if worker already has an action entry
    const updatedTask = await taskforworker.findOneAndUpdate(
      { _id: taskId, "actionStatuses.worker": nameofworker },
      {
        $set: {
          "actionStatuses.$.actions": actions,
          "actionStatuses.$.msg": msg,
          "actionStatuses.$.date": date,
        },
      },
      { new: true, runValidators: true }
    );

    // If the worker's action entry does not exist, add a new entry
    if (!updatedTask) {
      console.log("🔹 No existing worker action found, adding new entry...");

      const newEntry = await taskforworker.findByIdAndUpdate(
        taskId,
        {
          $push: {
            actionStatuses: {
              worker: nameofworker,
              actions: actions,
              msg: msg, // Ensure msg is always included
              date: date,
            },
          },
        },
        { new: true, runValidators: true }
      );

      if (!newEntry) {
        console.log("❌ Still couldn't update task.");
        return res.status(404).json({
          status: "error",
          message: "Task not found or worker action could not be updated.",
        });
      }

      console.log("✅ Worker action added successfully:", newEntry);
      return res.status(200).json({
        status: "success",
        message: `Task action marked as '${actions}' successfully.`,
        task: newEntry,
      });
    }

    console.log("✅ Task Updated Successfully:", updatedTask);
    res.status(200).json({
      status: "success",
      message: `Task action updated to '${actions}' successfully.`,
      task: updatedTask,
    });
  } catch (err) {
    console.error("❌ Error Details:", err.message, err.stack);
    res.status(500).json({
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

    console.log("🔹 Received Request:", { id, workerName });

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid task ID format." });
    }

    // Find the task
    const existingTask = await taskforworker.findById(id);
    if (!existingTask) {
      console.log("❌ Task not found in DB");
      return res
        .status(404)
        .json({ status: "error", message: "Task not found." });
    }

    console.log("✅ Task Found:", existingTask);

    // Update task by replacing workers array with only workerName
    const updatedTask = await taskforworker.findByIdAndUpdate(
      id,
      {
        $set: {
          "actionStatuses.$[elem].actions": "initiated",
          "actionStatuses.$[elem].msg": "",
          "actionStatuses.$[elem].date": "",
          "actionStatuses.$[elem].worker": workerName, // Assign correct worker name
          workers: [workerName],// 🔹 Remove all existing workers and store only workerName
        },
      },
      {
        new: true,
        runValidators: true,
        arrayFilters: [{ "elem.worker": existingTask.workers[0] }], // Target correct worker
      }
    );

    console.log("✅ Task Redeclared Successfully:", updatedTask);
    res.status(200).json({
      status: "success",
      message: "Task successfully redeclared.",
      task: updatedTask,
    });
  } catch (err) {
    console.error("❌ Error Details:", err.message, err.stack);
    res.status(500).json({
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

    console.log("🔹 Received Request:", { taskId, mainstatus });

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid task ID format.",
      });
    }

    // Check if task exists
    const taskExists = await task.findById(taskId);
    if (!taskExists) {
      console.log("❌ Task not found in DB");
      return res.status(404).json({
        status: "error",
        message: "Task not found.",
      });
    }

    console.log("✅ Task Found:", taskExists);

    // Update task status
    const updatedTask = await task.findByIdAndUpdate(
      taskId,
      { $set: { mainstatus } },
      { new: true, runValidators: true }
    );

    console.log("✅ Task Updated Successfully:", updatedTask);
    res.status(200).json({
      status: "done",
      message: "Task status updated successfully.",
      task: updatedTask,
    });
  } catch (err) {
    console.error("❌ Error Details:", err.message, err.stack);
    res.status(500).json({
      status: "error",
      message: "An unexpected error occurred.",
      error: err.message,
    });
  }
});

router.patch("/updatetask/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body; // Only update provided fields

    console.log("🔹 Received Request:", { id, updateFields });

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid task ID format." });
    }

    // Find the task and update only given fields (excluding subtasks)
    const updatedTask = await task.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true } // Return updated doc and validate fields
    );

    console.log("✅ Task Updated Successfully:", updatedTask);

    // If task not found
    if (!updatedTask) {
      return res
        .status(404)
        .json({ status: "error", message: "Task not found" });
    }

    res.json({
      status: "done",
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

router.delete("/deletetask/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🗑 Deleting Task with ID:", id);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid task ID format." });
    }

    // Find and delete the task
    const deletedTask = await task.findByIdAndDelete(id);

    // If task not found
    if (!deletedTask) {
      return res
        .status(404)
        .json({ status: "error", message: "Task not found" });
    }

    res.json({
      status: "done",
      message: "Task deleted successfully",
      task: deletedTask,
    });
  } catch (error) {
    console.error("❌ Error deleting task:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

router.patch("/updateworkertask/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const updateData = req.body;

    console.log("🔄 Updating Task:", taskId, updateData);

    // Find and update task
    const updatedTask = await taskforworker.findByIdAndUpdate(
      taskId,
      { $set: updateData },
      { new: true } // Return updated document
    );

    if (!updatedTask) {
      return res
        .status(404)
        .json({ status: "error", message: "Task not found" });
    }

    res.status(200).json({ status: "success", data: updatedTask });
  } catch (error) {
    console.error("❌ Error updating task:", error.message);
    res.status(500).json({ status: "error", message: "Failed to update task" });
  }
});


router.delete("/deleteworkertask/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🗑 Deleting Task with ID:", id);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid task ID format." });
    }

    // Find and delete the task
    const deletedTask = await taskforworker.findByIdAndDelete(id);

    // If task not found
    if (!deletedTask) {
      return res
        .status(404)
        .json({ status: "error", message: "Task not found" });
    }

    res.json({
      status: "done",
      message: "Task deleted successfully",
      task: deletedTask,
    });
  } catch (error) {
    console.error("❌ Error deleting task:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

module.exports = router;

// -------------------table joint for boss-------------------

router.get('/taskalldetail', async function (req, res, next) {
  try {
    const tasks = await task.find(); // Get tasks
    const taskIds = tasks.map(t => t._id);

    const taskForWorker = await taskforworker.find({ taskid: { $in: taskIds } }); // Get related taskforworker entries

    const combinedData = tasks.map(t => ({
      ...t.toObject(),
      taskforworker_details: taskForWorker.filter(w => w.taskid.equals(t._id)),
    }));

    res.status(200).json({
      status: "done",
      data: combinedData,
    });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch task details",
    });
  }
});

// ------------end joint-------------------

// -----------------------add task for worker---------------

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.post('/addtaskforworker', async function (req, res) {
  try {
    console.log("Request Body:", req.body);

    const { taskid, name, task, detail,assigndate, duedate, workers, priority, status } = req.body;
    const assignor = await user.findOne({ username: name });
    const alldata=await user.find();
    const validWorkerNames = alldata.map(worker => worker.username);
    const invalidWorkers = workers.filter(worker => !validWorkerNames.includes(worker));

    if (invalidWorkers.length > 0) {
      return res.status(400).json({
        status: "error",
        message: `The following workers do not exist: ${invalidWorkers.join(', ')}`,
      });
    }
 // Validate required fields
    if (!taskid || !name || !task || !assigndate || !duedate || !workers || !priority || !detail) {
      return res.status(400).json({
        status: "error",
        message: "All fields are required",
      });
    }
  
    // Check if assignor exists
    if (!assignor) {
      return res.status(404).json({
        status: "error",
        message: `Assignor '${name}' does not exist`,
      });
    }

    const actions = "initiated";

    // Create the task
    const newTask = await taskforworker.create({
      taskid,
      name,
      task,
      assigndate,
      duedate,
      workers,
      actions,
      priority,
      detail,
      status
    });

    res.status(200).json({
      status: "done",
      message: "Task added successfully",
      task: newTask,
    });
  } catch (err) {
    console.error("Error Details:", err.message, err.stack);
    res.status(500).json({
      status: "error",
      message: "An unexpected error occurred",
    });
  }
});

module.exports = router;
// ------------------------add task end------------------------

// -------------------------get-task-for-worker---------------

router.post('/gettaskforworker', async function (req, res, next) {
  try {
    const data = await taskforworker.find({ workers: req.body.name });

    res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// -------------------------get-task-for-worker-end---------------

//------------------------ get perticular task---------------------
router.post('/getpertitask/:id', async function (req, res, next) {
  try {
    const data = await task.findById(req.params.id);

    res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});
//------------------------ get perticular task end---------------------

// ---------------get-task-for manager---------------

router.post('/gettask', async function (req, res, next) {
  try {
    const data = await task.find({ name: req.body.name });  

    res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// --------------end-task------------------------------

// ----------------get manager----------------

router.get('/getman', async function (req, res, next) {
  try {
    const data = await user.find({ role: "TeamLead" });

    res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (err) {
    console.error(err); 
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

router.get("/manageralldetail", async function (req, res, next) {
  try {
    // Fetch all managers with selected fields (username and role)
    const managers = await manager.find({}, "username role");

    // Map manager data with their names and roles
    const combinedData = managers.map((m) => ({
      name: m.username,
      role: m.role,
      email: m.email,
      _id: m._id, 
      mobile: m.mobile
    }));

    res.status(200).json({
      status: "done",
      data: combinedData,
    });
  } catch (err) {
    console.error("Error fetching manager details:", err.message);
    res.status(500).json({
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

    res.json({ success: true, message: "Manager removed successfully" });
  } catch (error) {
    console.error("Error removing manager:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -------------get manager end---------

// -----------get worker--------------

router.get('/getwor', async function (req, res, next) {
  try {
    const data = await user.find({ role: "Associate" });
    console.log(data);
    res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (err) {
    console.error(err); 
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

router.delete("/removeworker/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedWorker = await Worker.findByIdAndDelete(id);

    if (!deletedWorker) {
      return res
        .status(404)
        .json({ success: false, message: "Worker not found" });
    }

    res.json({ success: true, message: "Worker removed successfully" });
  } catch (error) {
    console.error("Error removing worker:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ----------------get worker end------------



// ------------------------task assign start-----------------------
router.post('/addtask', async function (req, res, next) {
  try {
    console.log(req.body.username);

    // Find the worker by name
    var data = await user.findOne({ username: req.body.name });

  
    if (!data) {
      return res.status(404).json({
        status: "error",
        message: "This worker does not exist",
      });
    }

    var obj = {
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
      // mobile: req.body.mobile (if needed)
    };

    await task.create(obj);

    res.status(200).json({
      status: "done",
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(400).json({
      status: "error",
      message: "An unexpected error occurred",
    });
  }
});

// ------------------task assign end------------------------

// sign in
router.post('/verify', async function (req, res, next) {
  try {
    var name = req.body.username;
    console.log(name);

    var data = await user.findOne({ "username": name });

    if (data != null) {
      var encrypt = await bcrypt.compare(req.body.password, data.password)
      if (encrypt != false) {
        res.status(200).json({
          status: "done",
          data,
        })
      }
      else {
        res.status(400).json({
          status: "password",
          message: "invalid password"
        })
      }
    }

    else {
      res.status(400).json({
        status: "username",
        message: "invalid username",

      })
    }


  }
  catch (err) {
    res.status(400).json({
      status: "err",
    })
  }
});

router.get('/getuser', async function (req, res, next) {
  try {
    const username = req.query.username; // Extract username from query params
    console.log("Fetching user:", username);

    const data = await user.findOne({ username }); // Find user by username
    if (data) {
      res.status(200).json({
        status: "done",
        data,
      });
    } else {
      res.status(404).json({
        status: "not_found",
        message: "User not found",
      });
    }
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

const nodemailer = require('nodemailer');

router.post('/add', async function (req, res, next) {
  try {
    console.log(req.body.username);

    // Hash the password
    const crypt = await bcrypt.hash(req.body.password, 10);

    // Create the user object
    const obj = {
      username: req.body.username,
      role: req.body.role,
      email: req.body.email,
      domain: req.body.domain,
      mobile: req.body.mobile,
      password: crypt,
    };

    // Check if the email already exists
    const existingUser = await user.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({
        status: 'err',
        message: 'Email already exists. Please use a different email.',
      });
    }

    const existingMobile = await user.findOne({ mobile: req.body.mobile });
    if (existingMobile) {
      return res.status(400).json({
        status: 'err',
        message: 'Mobile number already exists. Please use a different mobile number.',
      });
    }

    // Send email if the role is "manager" or "worker"
    if (req.body.role === 'TeamLead' || req.body.role === 'Associate') {
      const transporter = nodemailer.createTransport({
        service: 'gmail', // Use your email service (e.g., Gmail, Outlook)
        auth: {
          user: 'devvaghani89@gmail.com',
          pass: 'eriv ljjb mlsf wpdz',
        },
      });

      const mailOptions = {
        from: 'devvaghani89@gmail.com', // Sender address
        to: req.body.email, // Manager's email address
        subject: 'Account Created Successfully',
        text: `Dear ${req.body.username},\n\nYour account has been created successfully.\n\nUsername: ${req.body.username}\nPassword: ${req.body.password}\n\nPlease keep this information secure.\n\nBest regards,\nYour Team`,
      };

      // Send the email
      await transporter.sendMail(mailOptions);
    }

    // Save the user to the database
    await user.create(obj);

    // Send a success response
    res.status(200).json({
      status: 'done',
    });
  } catch (err) {
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        status: 'err',
        message: 'Duplicate entry. Email already exists.',
      });
    }

    console.error('Error:', err);
    res.status(500).json({
      status: 'err',
      message: 'Internal server error',
    });
  }
});

// forget password-api for send otp

// In-memory storage for OTPs
let otpStorage = 0;
let uemail = ''

router.post('/otp', async function (req, res, next) {
  try {
    const email = req.body.email;

    const loguser = await user.findOne({ email: email });

    if (loguser) {

      res.status(200).json({
        status: "valid_user"
      })

      var otp = Math.floor((Math.random() * 1000000) + 1);

      // Store OTP in memory (no expiration time)
      otpStorage = otp;
      uemail = email;
      var mailOptions = {
        from: 'devvaghani89@gmail.com',
        to: `${email}`,
        subject: 'otp for verification',
        text: `${otp}`,
      };

      const transporter = nodemailer.createTransport({
        service: "gmail", // Use your email service (e.g., Gmail, Outlook)
        auth: {
          user: "devvaghani89@gmail.com",
          pass: "eriv ljjb mlsf wpdz",
        },
      });

      const rk = transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
          console.log('actual otp ' + otpStorage)
        }
      });

      console.log('Email sent:', rk);
      console.log('OTP sent:', otp);

    }
    else {
      res.status(200).json({
        status: "invalid_user"
      })
    }
  }
  catch {
    res.status(400).json({
      status: "err",
      message: "Internal server error"
    })
  }
})

router.post('/checkotp', async function (req, res, next) {

  const userotp = req.body.otp;

  try {
    if (parseInt(userotp) == parseInt(otpStorage)) {
      res.status(200).json({
        status: "otp_varified"
      })
    }
    else {
      res.status(200).json({
        status: "otp_error"
      })
    }

  } catch (error) {
    res.status(400).json({
      status: "err",
    })
  }
})
// for new password
router.post('/newpassword', async function (req, res, next) {

  const newpassword = req.body.newpassword;
  const rnewpassword = req.body.rnewpassword;
  // const email = req.body.email;
  // const email = 'dev@gail.com'

  console.log(newpassword, rnewpassword)

  try {
    if (newpassword == rnewpassword) {
      console.log("email", uemail);
    const crypt = await bcrypt.hash(newpassword, 10);
      const updateuser = await user.findOneAndUpdate(
        { email: uemail },
        { password: crypt }
      );

      console.log(updateuser)
      
      if (updateuser) {
        res.status(200).json({
          status: "changed"
        })
      } else {
        res.status(200).json({
          status: "notchanged"
        })
      }
    }
    else {
      res.status(200).json({
        status: "otp_error"
      })
    }

  } catch (error) {
    res.status(400).json({
      status: "err",
    })
  }
})

module.exports = router;
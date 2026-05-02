const Task = require('../models/Task');
const Project = require('../models/Project');

// GET /api/tasks  (with optional ?projectId=&status=&assignedTo=)
const getTasks = async (req, res) => {
  try {
    const filter = {};
    if (req.query.projectId) filter.project = req.query.projectId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

    // Members only see tasks in their projects or assigned to them
    if (req.user.role !== 'admin') {
      const userProjects = await Project.find({ members: req.user._id }).select('_id');
      const projectIds = userProjects.map((p) => p._id);
      filter.$or = [{ project: { $in: projectIds } }, { assignedTo: req.user._id }];
    }

    const tasks = await Task.find(filter)
      .populate('project', 'title color')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort('-createdAt');

    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/tasks
const createTask = async (req, res) => {
  try {
    const { title, description, projectId, assignedTo, status, priority, dueDate } = req.body;
    if (!title || !projectId) return res.status(400).json({ message: 'Title and projectId are required' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const task = await Task.create({
      title, description, project: projectId,
      assignedTo: assignedTo || null,
      createdBy: req.user._id,
      status: status || 'pending',
      priority: priority || 'medium',
      dueDate: dueDate || null,
    });

    await task.populate('project', 'title color');
    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');

    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/tasks/:id
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'title color members')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isAdmin = req.user.role === 'admin';
    const isAssigned = task.assignedTo && task.assignedTo.toString() === req.user._id.toString();

    if (!isAdmin && !isAssigned) {
      return res.status(403).json({ message: 'Access denied: can only update your own tasks' });
    }

    const { title, description, status, priority, dueDate, assignedTo } = req.body;

    // Members can only update status
    if (!isAdmin) {
      if (status) task.status = status;
    } else {
      if (title) task.title = title;
      if (description !== undefined) task.description = description;
      if (status) task.status = status;
      if (priority) task.priority = priority;
      if (dueDate !== undefined) task.dueDate = dueDate;
      if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    }

    await task.save();
    await task.populate('project', 'title color');
    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');

    res.json({ task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    await task.deleteOne();
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getTasks, createTask, getTask, updateTask, deleteTask };

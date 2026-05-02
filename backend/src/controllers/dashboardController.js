const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');

// GET /api/dashboard
const getDashboard = async (req, res) => {
  try {
    const now = new Date();
    let taskFilter = {};
    let projectFilter = {};

    if (req.user.role !== 'admin') {
      const userProjects = await Project.find({ members: req.user._id }).select('_id');
      const projectIds = userProjects.map((p) => p._id);
      taskFilter = { $or: [{ project: { $in: projectIds } }, { assignedTo: req.user._id }] };
      projectFilter = { members: req.user._id };
    }

    const [totalTasks, completedTasks, inProgressTasks, pendingTasks, overdueTasks, totalProjects, recentTasks, projects] =
      await Promise.all([
        Task.countDocuments(taskFilter),
        Task.countDocuments({ ...taskFilter, status: 'completed' }),
        Task.countDocuments({ ...taskFilter, status: 'in-progress' }),
        Task.countDocuments({ ...taskFilter, status: 'pending' }),
        Task.countDocuments({
          ...taskFilter,
          dueDate: { $lt: now },
          status: { $ne: 'completed' },
        }),
        Project.countDocuments(projectFilter),
        Task.find(taskFilter)
          .populate('project', 'title color')
          .populate('assignedTo', 'name email')
          .sort('-createdAt')
          .limit(8),
        Project.find(projectFilter)
          .populate('owner', 'name email')
          .populate('members', 'name email')
          .sort('-createdAt')
          .limit(5),
      ]);

    let totalUsers = 0;
    if (req.user.role === 'admin') {
      totalUsers = await User.countDocuments();
    }

    res.json({
      stats: { totalTasks, completedTasks, inProgressTasks, pendingTasks, overdueTasks, totalProjects, totalUsers },
      recentTasks,
      projects,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getDashboard };

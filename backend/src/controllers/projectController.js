const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

// GET /api/projects
const getProjects = async (req, res) => {
  try {
    let projects;
    if (req.user.role === 'admin') {
      projects = await Project.find().populate('owner', 'name email').populate('members', 'name email role');
    } else {
      projects = await Project.find({ members: req.user._id }).populate('owner', 'name email').populate('members', 'name email role');
    }
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/projects
const createProject = async (req, res) => {
  try {
    const { title, description, color, memberIds } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const members = memberIds ? [...new Set([...memberIds, req.user._id.toString()])] : [req.user._id];
    const project = await Project.create({ title, description, color, owner: req.user._id, members });
    await project.populate('owner', 'name email');
    await project.populate('members', 'name email role');
    res.status(201).json({ project });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/projects/:id
const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email role');
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Access control: admin or member
    const isMember = project.members.some((m) => m._id.toString() === req.user._id.toString());
    if (req.user.role !== 'admin' && !isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const tasks = await Task.find({ project: project._id })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort('-createdAt');

    res.json({ project, tasks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/projects/:id
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const { title, description, color, status } = req.body;
    if (title) project.title = title;
    if (description !== undefined) project.description = description;
    if (color) project.color = color;
    if (status) project.status = status;

    await project.save();
    await project.populate('owner', 'name email');
    await project.populate('members', 'name email role');
    res.json({ project });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/projects/:id
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    await Task.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/projects/:id/members
const addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (project.members.includes(userId)) {
      return res.status(409).json({ message: 'User already in project' });
    }
    project.members.push(userId);
    await project.save();
    await project.populate('members', 'name email role');
    res.json({ project });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/projects/:id/members/:userId
const removeMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.owner.toString() === req.params.userId) {
      return res.status(400).json({ message: 'Cannot remove the project owner' });
    }
    project.members = project.members.filter((m) => m.toString() !== req.params.userId);
    await project.save();
    await project.populate('members', 'name email role');
    res.json({ project });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getProjects, createProject, getProject, updateProject, deleteProject, addMember, removeMember };

const express = require('express');
const {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
} = require('../controllers/projectController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getProjects);
router.post('/', protect, adminOnly, createProject);
router.get('/:id', protect, getProject);
router.put('/:id', protect, adminOnly, updateProject);
router.delete('/:id', protect, adminOnly, deleteProject);

router.post('/:id/members', protect, adminOnly, addMember);
router.delete('/:id/members/:userId', protect, adminOnly, removeMember);

module.exports = router;

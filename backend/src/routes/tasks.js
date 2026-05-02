const express = require('express');
const { getTasks, createTask, getTask, updateTask, deleteTask } = require('../controllers/taskController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getTasks);
router.post('/', protect, adminOnly, createTask);
router.get('/:id', protect, getTask);
router.put('/:id', protect, updateTask);
router.delete('/:id', protect, adminOnly, deleteTask);

module.exports = router;

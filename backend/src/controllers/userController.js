const User = require('../models/User');

// GET /api/users  (admin only)
const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort('-createdAt');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/users/:id  (admin only — update role)
const updateUser = async (req, res) => {
  try {
    const { role, name } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (role) user.role = role;
    if (name) user.name = name;
    await user.save();
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/users/:id  (admin only)
const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await user.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getUsers, updateUser, deleteUser };

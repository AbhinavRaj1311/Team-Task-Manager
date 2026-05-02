const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT and attach user to request
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Restrict to admin only
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ message: 'Access denied: Admins only' });
};

// Restrict to specific roles
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: `Access denied: requires ${roles.join('/')} role` });
  }
  next();
};

module.exports = { protect, adminOnly, authorize };

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const { seedDefaultAdmin } = require('./utils/seedAdmin');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');

const app = express();

// Middleware
const rawClientUrls = (process.env.CLIENT_URL || '').trim();
const allowedOrigins = rawClientUrls
  ? rawClientUrls
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : [];

const isDev = (process.env.NODE_ENV || 'development') !== 'production';
const isLocalhostOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(origin || ''));

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser clients (curl, server-to-server)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (isDev && allowedOrigins.length === 0 && isLocalhostOrigin(origin)) return cb(null, true);
      const err = new Error('Not allowed by CORS');
      // @ts-ignore - used by our generic error handler
      err.status = 403;
      return cb(err);
    },
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);

// Route aliases (no /api prefix) for spec compatibility
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/tasks', taskRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// Connect DB and start server
const PORT = process.env.PORT || 5000;

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  console.error('❌ Missing required env var: MONGODB_URI (or MONGO_URI)');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('❌ Missing required env var: JWT_SECRET');
  process.exit(1);
}

const mongooseConnectOptions = {};
if (process.env.MONGODB_DBNAME) {
  mongooseConnectOptions.dbName = process.env.MONGODB_DBNAME;
}

mongoose
  .connect(mongoUri, mongooseConnectOptions)
  .then(async () => {
    console.log('✅ MongoDB connected');

    try {
      const result = await seedDefaultAdmin();
      if (result?.seeded) {
        console.log(`👤 Default admin ready: ${result.user.email}${result.updatedRole ? ' (role updated)' : ''}`);
      } else if (result?.reason) {
        console.log(`ℹ️ Admin seed skipped: ${result.reason}`);
      }
    } catch (e) {
      console.error('⚠️ Admin seed failed:', e.message || e);
    }

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

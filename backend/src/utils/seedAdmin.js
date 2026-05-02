const User = require('../models/User');

async function seedDefaultAdmin() {
  const shouldSeed = String(process.env.SEED_DEFAULT_ADMIN || '').toLowerCase() === 'true';
  if (!shouldSeed) return { seeded: false, reason: 'SEED_DEFAULT_ADMIN not enabled' };

  const name = process.env.DEFAULT_ADMIN_NAME || 'Admin';
  const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@local.test';
  if (!email) {
    return { seeded: false, reason: 'DEFAULT_ADMIN_EMAIL missing' };
  }

  let password = process.env.DEFAULT_ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === 'production') {
      return { seeded: false, reason: 'DEFAULT_ADMIN_PASSWORD missing (production)' };
    }
    // Dev-only fallback to avoid blocking local boot.
    password = 'Admin@12345';
  }

  const resetPasswordExplicit = String(process.env.DEFAULT_ADMIN_RESET_PASSWORD || '').toLowerCase() === 'true';
  const canResetPassword = process.env.NODE_ENV !== 'production' || resetPasswordExplicit;

  const existing = await User.findOne({ email }).select('_id email role');
  if (existing) {
    let updatedRole = false;
    let resetPassword = false;

    if (existing.role !== 'admin') {
      existing.role = 'admin';
      updatedRole = true;
    }

    if (password && canResetPassword) {
      // Need password selected to update it
      const full = await User.findById(existing._id).select('+password');
      full.password = password;
      full.role = existing.role;
      await full.save();
      resetPassword = true;
    } else {
      if (updatedRole) await existing.save();
    }

    if (updatedRole || resetPassword) {
      return {
        seeded: true,
        user: { id: existing._id.toString(), email: existing.email },
        updatedRole,
        resetPassword,
      };
    }

    return { seeded: false, reason: `Default admin already exists (${existing.email})` };
  }

  const user = await User.create({ name, email, password, role: 'admin' });
  return { seeded: true, user: { id: user._id.toString(), email: user.email } };
}

module.exports = { seedDefaultAdmin };

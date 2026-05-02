const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      default: '',
      maxlength: 500,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active',
    },
    color: {
      type: String,
      default: '#7c3aed',
    },
  },
  { timestamps: true }
);

// Ensure owner is always in members
projectSchema.pre('save', function () {
  // Note: ObjectId equality by value, not reference
  const ownerId = this.owner?.toString();
  const hasOwner = (this.members || []).some((m) => m?.toString() === ownerId);
  if (!hasOwner && ownerId) {
    this.members.push(this.owner);
  }
});

module.exports = mongoose.model('Project', projectSchema);

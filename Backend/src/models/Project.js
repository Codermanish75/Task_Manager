const mongoose = require('mongoose');

// Per-project member with role
const projectMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 200 },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
      default: 'planning',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // members now store { user, role }
    members: [projectMemberSchema],
    start_date: { type: Date, default: null },
    end_date: { type: Date, default: null },
    color: { type: String, default: '#6366f1', maxlength: 7 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual: tasks (populated externally via Task.find({ project: id }))
projectSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
});

// Virtual: task_count
projectSchema.virtual('task_count', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  count: true,
});

module.exports = mongoose.model('Project', projectSchema);

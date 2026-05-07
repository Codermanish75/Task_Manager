const User = require('./User');
const Project = require('./Project');
const Task = require('./Task');

const mongoose = require('mongoose');

// Comment Schema
const commentSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

// Notification Schema
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    is_read: { type: Boolean, default: false },
    link: { type: String, default: '' },
  },
  { timestamps: true }
);

const Comment = mongoose.models.Comment || mongoose.model('Comment', commentSchema);

const Notification =
  mongoose.models.Notification ||
  mongoose.model('Notification', notificationSchema);

module.exports = {
  User,
  Project,
  Task,
  Comment,
  Notification,
};
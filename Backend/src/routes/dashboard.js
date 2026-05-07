const router = require('express').Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const { authenticate } = require('../middleware/auth');

// GET /api/dashboard/stats/
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    const projects = await Project.find({
      $or: [{ owner: userId }, { 'members.user': userId }],
    });
    const projectIds = projects.map((p) => p._id);

    const tasks = await Task.find({ project: { $in: projectIds } });
    const myTasks = tasks.filter(
      (t) => t.assigned_to && t.assigned_to.toString() === userId.toString()
    );

    const now = new Date();
    return res.json({
      total_projects: projects.length,
      active_projects: projects.filter((p) => p.status === 'active').length,
      completed_projects: projects.filter((p) => p.status === 'completed').length,
      total_tasks: tasks.length,
      my_tasks: myTasks.length,
      completed_tasks: tasks.filter((t) => t.status === 'done').length,
      in_progress_tasks: tasks.filter((t) => t.status === 'in_progress').length,
      overdue_tasks: myTasks.filter(
        (t) => t.due_date && !['done'].includes(t.status) && new Date(t.due_date) < now
      ).length,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
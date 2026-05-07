const router = require('express').Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const { Notification } = require('../models/index');
const { authenticate, loadProjectRole, requireProjectMember, requireProjectAdmin } = require('../middleware/auth');

const formatTask = (task) => ({
  id: task._id,
  title: task.title,
  description: task.description,
  project: task.project?._id || task.project,
  assigned_to: task.assigned_to
    ? task.assigned_to.toPublic ? task.assigned_to.toPublic() : task.assigned_to
    : null,
  created_by: task.created_by
    ? task.created_by.toPublic ? task.created_by.toPublic() : task.created_by
    : null,
  status: task.status,
  priority: task.priority,
  due_date: task.due_date,
  created_at: task.createdAt,
  updated_at: task.updatedAt,
  tags: task.tags,
  tags_list: task.tags_list,
  estimated_hours: task.estimated_hours,
  comments: (task.comments || []).map((c) => ({
    id: c._id,
    task: c.task,
    author: c.author?.toPublic ? c.author.toPublic() : c.author,
    content: c.content,
    created_at: c.createdAt,
  })),
  comment_count: (task.comments || []).length,
});

const getAccessibleProjectIds = async (userId) => {
  const projects = await Project.find({
    $or: [{ owner: userId }, { 'members.user': userId }],
  }).select('_id');
  return projects.map((p) => p._id);
};

/**
 * Helper: check if user has admin rights in a project
 */
const isProjectAdmin = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return false;
  if (project.owner.toString() === userId.toString()) return true;
  const m = project.members.find((m) => m.user.toString() === userId.toString());
  return m?.role === 'admin';
};

// ─── GET /api/tasks/ ──────────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const projectIds = await getAccessibleProjectIds(userId);

    const filter = { project: { $in: projectIds } };
    if (req.query.project) filter.project = req.query.project;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.assigned_to_me === 'true') filter.assigned_to = userId;

    const tasks = await Task.find(filter)
      .populate('assigned_to', '-password')
      .populate('created_by', '-password')
      .populate({ path: 'comments', populate: { path: 'author', select: '-password' } })
      .sort({ createdAt: -1 });

    return res.json(tasks.map(formatTask));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/tasks/ ─────────────────────────────────────────────────────────
// All project members can create tasks
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, project, assigned_to_id, status, priority, due_date, tags, estimated_hours } = req.body;

    if (!title || !project) return res.status(400).json({ error: 'Title and project are required.' });

    // Verify user is a member
    const projectIds = await getAccessibleProjectIds(req.user._id);
    const isMember = projectIds.some((id) => id.toString() === project.toString());
    if (!isMember) return res.status(403).json({ error: 'You are not a member of this project.' });

    const task = await Task.create({
      title, description, project,
      assigned_to: assigned_to_id || null,
      created_by: req.user._id,
      status, priority,
      due_date: due_date || null,
      tags, estimated_hours,
    });

    if (task.assigned_to && task.assigned_to.toString() !== req.user._id.toString()) {
      await Notification.create({
        user: task.assigned_to,
        message: `Task assigned to you: ${task.title}`,
        link: `/projects/${task.project}`,
      });
    }

    await task.populate('assigned_to', '-password');
    await task.populate('created_by', '-password');
    await task.populate({ path: 'comments', populate: { path: 'author', select: '-password' } });

    return res.status(201).json(formatTask(task));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/tasks/:id ───────────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assigned_to', '-password')
      .populate('created_by', '-password')
      .populate({ path: 'comments', populate: { path: 'author', select: '-password' } });

    if (!task) return res.status(404).json({ error: 'Task not found.' });

    // verify access
    const projectIds = await getAccessibleProjectIds(req.user._id);
    if (!projectIds.some((id) => id.toString() === task.project.toString())) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    return res.json(formatTask(task));
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── PUT /api/tasks/:id ───────────────────────────────────────────────────────
// Members can update status/comments on own tasks; admins can update everything
router.put('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    const userId = req.user._id;
    const projectIds = await getAccessibleProjectIds(userId);
    if (!projectIds.some((id) => id.toString() === task.project.toString())) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const adminRights = await isProjectAdmin(task.project, userId);
    const isCreator = task.created_by?.toString() === userId.toString();
    const isAssigned = task.assigned_to?.toString() === userId.toString();

    const { title, description, assigned_to_id, status, priority, due_date, tags, estimated_hours } = req.body;

    // Members can change status of their own tasks; admins can change everything
    if (adminRights) {
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (assigned_to_id !== undefined) task.assigned_to = assigned_to_id || null;
      if (status !== undefined) task.status = status;
      if (priority !== undefined) task.priority = priority;
      if (due_date !== undefined) task.due_date = due_date || null;
      if (tags !== undefined) task.tags = tags;
      if (estimated_hours !== undefined) task.estimated_hours = estimated_hours;
    } else if (isCreator || isAssigned) {
      // Non-admin members: can update status, description, tags of their own tasks
      if (status !== undefined) task.status = status;
      if (description !== undefined) task.description = description;
      if (tags !== undefined) task.tags = tags;
    } else {
      return res.status(403).json({
        error: 'Only project admins or the task creator/assignee can update this task.',
      });
    }

    // Notify on assignment change
    if (adminRights && assigned_to_id !== undefined) {
      const newAssignee = assigned_to_id ? assigned_to_id.toString() : null;
      const prevAssignee = task.assigned_to ? task.assigned_to.toString() : null;
      if (newAssignee && newAssignee !== prevAssignee && newAssignee !== userId.toString()) {
        await Notification.create({
          user: newAssignee,
          message: `Task assigned to you: ${task.title}`,
          link: `/projects/${task.project}`,
        });
      }
    }

    await task.save();
    await task.populate('assigned_to', '-password');
    await task.populate('created_by', '-password');
    await task.populate({ path: 'comments', populate: { path: 'author', select: '-password' } });

    return res.json(formatTask(task));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────
// Only admins or task creator can delete
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    const userId = req.user._id;
    const adminRights = await isProjectAdmin(task.project, userId);
    const isCreator = task.created_by?.toString() === userId.toString();

    if (!adminRights && !isCreator) {
      return res.status(403).json({ error: 'Only project admins or the task creator can delete tasks.' });
    }

    await task.deleteOne();
    return res.json({ message: 'Task deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

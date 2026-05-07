const router = require('express').Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const { Notification } = require('../models/index');
const User = require('../models/User');
const {
  authenticate,
  loadProjectRole,
  requireProjectMember,
  requireProjectAdmin,
  requireProjectOwner,
} = require('../middleware/auth');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const projectStats = async (projectId) => {
  const tasks = await Task.find({ project: projectId });
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  return {
    task_count: total,
    completed_task_count: done,
    progress: total === 0 ? 0 : Math.round((done / total) * 100),
  };
};

const formatMember = (m) => ({
  ...( m.user.toPublic ? m.user.toPublic() : m.user ),
  project_role: m.role,
});

const formatProject = async (project, includeTasks = false, currentUserId = null) => {
  const stats = await projectStats(project._id);
  const ownerId = project.owner._id ? project.owner._id.toString() : project.owner.toString();

  // Determine caller's role
  let callerRole = null;
  if (currentUserId) {
    const uid = currentUserId.toString();
    if (ownerId === uid) {
      callerRole = 'owner';
    } else {
      const m = project.members.find((m) => m.user._id.toString() === uid);
      callerRole = m ? m.role : null;
    }
  }

  const base = {
    id: project._id,
    name: project.name,
    description: project.description,
    status: project.status,
    priority: project.priority,
    owner: project.owner.toPublic ? project.owner.toPublic() : project.owner,
    members: project.members.map(formatMember),
    start_date: project.start_date,
    end_date: project.end_date,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
    color: project.color,
    caller_role: callerRole,
    ...stats,
  };

  if (includeTasks) {
    const tasks = await Task.find({ project: project._id })
      .populate('assigned_to', '-password')
      .populate('created_by', '-password')
      .populate({ path: 'comments', populate: { path: 'author', select: '-password' } })
      .sort({ createdAt: -1 });
    base.tasks = tasks.map(formatTask);
  }

  return base;
};

const formatTask = (task) => ({
  id: task._id,
  title: task.title,
  description: task.description,
  project: task.project,
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

// ─── GET /api/projects/ ───────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const projects = await Project.find({
      $or: [{ owner: userId }, { 'members.user': userId }],
    })
      .populate('owner', '-password')
      .populate('members.user', '-password')
      .sort({ createdAt: -1 });

    const result = await Promise.all(projects.map((p) => formatProject(p, false, userId)));
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/projects/ ──────────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, status, priority, start_date, end_date, color, members = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required.' });

    // members: [{ user_id, role }] or legacy [id strings]
    const normalizedMembers = members.map((m) => {
      if (typeof m === 'string') return { user: m, role: 'member' };
      return { user: m.user_id || m.user, role: m.role || 'member' };
    });

    const project = await Project.create({
      name, description, status, priority,
      start_date: start_date || null,
      end_date: end_date || null,
      color,
      owner: req.user._id,
      members: normalizedMembers,
    });

    await project.populate('owner', '-password');
    await project.populate('members.user', '-password');

    for (const m of normalizedMembers) {
      const uid = m.user?.toString();
      if (uid && uid !== req.user._id.toString()) {
        await Notification.create({
          user: uid,
          message: `You've been added to project "${project.name}" as ${m.role}`,
          link: `/projects/${project._id}`,
        });
      }
    }

    return res.status(201).json(await formatProject(project, false, req.user._id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/projects/:id ────────────────────────────────────────────────────
router.get('/:id', authenticate, loadProjectRole, requireProjectMember, async (req, res) => {
  try {
    return res.json(await formatProject(req.project, true, req.user._id));
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── PUT /api/projects/:id ────────────────────────────────────────────────────
// Only owner or project-admin can edit project settings
router.put('/:id', authenticate, loadProjectRole, requireProjectAdmin, async (req, res) => {
  try {
    const project = req.project;
    const { name, description, status, priority, start_date, end_date, color, members } = req.body;

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (status !== undefined) project.status = status;
    if (priority !== undefined) project.priority = priority;
    if (start_date !== undefined) project.start_date = start_date || null;
    if (end_date !== undefined) project.end_date = end_date || null;
    if (color !== undefined) project.color = color;

    // Only owner can bulk-replace members list
    if (members !== undefined && req.projectRole === 'owner') {
      project.members = members.map((m) => {
        if (typeof m === 'string') return { user: m, role: 'member' };
        return { user: m.user_id || m.user, role: m.role || 'member' };
      });
    }

    await project.save();
    await project.populate('owner', '-password');
    await project.populate('members.user', '-password');

    return res.json(await formatProject(project, false, req.user._id));
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── DELETE /api/projects/:id ─────────────────────────────────────────────────
router.delete('/:id', authenticate, loadProjectRole, requireProjectOwner, async (req, res) => {
  try {
    await Task.deleteMany({ project: req.project._id });
    await req.project.deleteOne();
    return res.json({ message: 'Project deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/projects/:id/add_member ───────────────────────────────────────
router.post('/:id/add_member', authenticate, loadProjectRole, requireProjectAdmin, async (req, res) => {
  try {
    const project = req.project;
    const { user_id, role = 'member' } = req.body;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "admin" or "member".' });
    }

    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const already = project.members.find((m) => m.user._id.toString() === user._id.toString());
    if (already) {
      already.role = role; // update role if already member
    } else {
      project.members.push({ user: user._id, role });
    }
    await project.save();

    await Notification.create({
      user: user._id,
      message: `You've been added to project "${project.name}" as ${role}`,
      link: `/projects/${project._id}`,
    });

    return res.json({ message: `${user.username} added as ${role}.` });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/projects/:id/remove_member ────────────────────────────────────
router.post('/:id/remove_member', authenticate, loadProjectRole, requireProjectAdmin, async (req, res) => {
  try {
    const project = req.project;
    const { user_id } = req.body;

    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Admins can only remove members; only owner can remove admins
    const targetMembership = project.members.find(
      (m) => m.user._id.toString() === user._id.toString()
    );
    if (targetMembership?.role === 'admin' && req.projectRole !== 'owner') {
      return res.status(403).json({ error: 'Only the project owner can remove admins.' });
    }

    project.members = project.members.filter(
      (m) => m.user._id.toString() !== user._id.toString()
    );
    await project.save();

    return res.json({ message: `${user.username} removed from project.` });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/projects/:id/change_member_role ───────────────────────────────
router.post('/:id/change_member_role', authenticate, loadProjectRole, requireProjectOwner, async (req, res) => {
  try {
    const project = req.project;
    const { user_id, role } = req.body;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "admin" or "member".' });
    }

    const membership = project.members.find(
      (m) => m.user._id.toString() === user_id.toString()
    );
    if (!membership) return res.status(404).json({ error: 'User is not a member of this project.' });

    membership.role = role;
    await project.save();

    await project.populate('owner', '-password');
    await project.populate('members.user', '-password');

    return res.json({
      message: `Role updated to ${role}.`,
      project: await formatProject(project, false, req.user._id),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/projects/:id/stats ─────────────────────────────────────────────
router.get('/:id/stats', authenticate, loadProjectRole, requireProjectMember, async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.project._id });
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    return res.json({
      total,
      todo: tasks.filter((t) => t.status === 'todo').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      review: tasks.filter((t) => t.status === 'review').length,
      done,
      progress: total === 0 ? 0 : Math.round((done / total) * 100),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

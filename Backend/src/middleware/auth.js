const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Project = require('../models/Project');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication credentials were not provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(401).json({ error: 'User not found.' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

/**
 * requireSystemAdmin — only global admins can proceed
 */
const requireSystemAdmin = (req, res, next) => {
  if (req.user?.system_role !== 'admin') {
    return res.status(403).json({ error: 'System administrator access required.' });
  }
  next();
};

/**
 * loadProjectRole — attaches req.projectRole ('owner' | 'admin' | 'member' | null)
 * and req.project to the request. Does NOT send error responses on its own.
 * Must be called AFTER authenticate.
 */
const loadProjectRole = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId || req.body?.project;
    if (!projectId) return next();

    const project = await Project.findById(projectId)
      .populate('owner', '-password')
      .populate('members.user', '-password');

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    req.project = project;
    const userId = req.user._id.toString();

    if (project.owner._id.toString() === userId) {
      req.projectRole = 'owner';
    } else {
      const membership = project.members.find(
        (m) => m.user._id.toString() === userId
      );
      req.projectRole = membership ? membership.role : null;
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * requireProjectMember — user must be owner, admin, or member
 */
const requireProjectMember = (req, res, next) => {
  if (!req.projectRole) {
    return res.status(403).json({ error: 'You are not a member of this project.' });
  }
  next();
};

/**
 * requireProjectAdmin — user must be owner OR project-admin
 */
const requireProjectAdmin = (req, res, next) => {
  if (!req.projectRole || req.projectRole === 'member') {
    return res.status(403).json({
      error: 'Project admin access required. Only project owners and admins can perform this action.',
    });
  }
  next();
};

/**
 * requireProjectOwner — only the project owner
 */
const requireProjectOwner = (req, res, next) => {
  if (req.projectRole !== 'owner') {
    return res.status(403).json({
      error: 'Only the project owner can perform this action.',
    });
  }
  next();
};

module.exports = {
  authenticate,
  requireSystemAdmin,
  loadProjectRole,
  requireProjectMember,
  requireProjectAdmin,
  requireProjectOwner,
};

const router = require('express').Router();
const User = require('../models/User');
const { authenticate, requireSystemAdmin } = require('../middleware/auth');

// GET /api/users/  — any authenticated user can list users (for assignment dropdowns)
router.get('/', authenticate, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    return res.json(users.map((u) => u.toPublic()));
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/users/:id/system_role  — only system admins can promote/demote
router.patch('/:id/system_role', authenticate, requireSystemAdmin, async (req, res) => {
  try {
    const { system_role } = req.body;
    if (!['admin', 'user'].includes(system_role)) {
      return res.status(400).json({ error: 'system_role must be "admin" or "user".' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { system_role },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json(user.toPublic());
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

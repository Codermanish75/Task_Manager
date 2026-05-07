const router = require('express').Router();
const { Notification } = require('../models/index');
const { authenticate } = require('../middleware/auth');

// GET /api/notifications/
router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json(
      notifications.map((n) => ({
        id: n._id,
        message: n.message,
        is_read: n.is_read,
        created_at: n.createdAt,
        link: n.link,
      }))
    );
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/notifications/read/
router.post('/read', authenticate, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, is_read: false }, { is_read: true });
    return res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

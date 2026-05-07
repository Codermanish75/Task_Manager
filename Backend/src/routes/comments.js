const router = require('express').Router();
const { Comment } = require('../models/index');
const { authenticate } = require('../middleware/auth');

// POST /api/comments/
router.post('/', authenticate, async (req, res) => {
  try {
    const { task, content } = req.body;
    if (!task || !content) {
      return res.status(400).json({ error: 'Task and content are required.' });
    }

    const comment = await Comment.create({ task, content, author: req.user._id });
    await comment.populate('author', '-password');

    return res.status(201).json({
      id: comment._id,
      task: comment.task,
      author: comment.author.toPublic(),
      content: comment.content,
      created_at: comment.createdAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { generateTokens } = require('../middleware/tokens');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, first_name = '', last_name = '', password, password2 } = req.body;

  if (!username || !email || !password || !password2) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (password !== password2) {
    return res.status(400).json({ password: 'Passwords do not match.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ password: 'Password must be at least 6 characters.' });
  }

  try {
    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) {
      const field = exists.username === username ? 'username' : 'email';
      return res.status(400).json({ [field]: `A user with this ${field} already exists.` });
    }

    const user = await User.create({ username, email, first_name, last_name, password });
    const { access, refresh } = generateTokens(user._id);

    return res.status(201).json({
      user: user.toPublic(),
      access,
      refresh,
      message: 'Registration successful!',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  let { username = '', password = '' } = req.body;
  username = username.trim();

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    // Allow login via email
    let user;
    if (username.includes('@')) {
      user = await User.findOne({ email: username });
    } else {
      user = await User.findOne({ username });
    }

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const { access, refresh } = generateTokens(user._id);

    return res.json({
      user: user.toPublic(),
      access,
      refresh,
      message: 'Login successful!',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/logout  (stateless JWT — just acknowledge)
router.post('/logout', authenticate, (req, res) => {
  return res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  return res.json(req.user.toPublic());
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refresh } = req.body;
  if (!refresh) return res.status(400).json({ error: 'Refresh token required.' });

  try {
    const decoded = jwt.verify(refresh, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') throw new Error('Not a refresh token');

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found.' });

    const { access, refresh: newRefresh } = generateTokens(user._id);
    return res.json({ access, refresh: newRefresh });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

module.exports = router;

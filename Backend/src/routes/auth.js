const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../middleware/tokens');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, first_name, last_name } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'Username, email and password required.' });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ error: 'Username or email already taken.' });

    const user = await User.create({ username, email, password, first_name, last_name });
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.status(201).json({ access: accessToken, refresh: refreshToken, user: user.toPublic() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const identifier = username || email;
    if (!identifier || !password)
      return res.status(400).json({ error: 'Credentials required.' });

    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.json({ access: accessToken, refresh: refreshToken, user: user.toPublic() });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  return res.json({ message: 'Logged out.' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  return res.json(req.user.toPublic());
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  try {
    const { refresh } = req.body;
    if (!refresh) return res.status(400).json({ error: 'Refresh token required.' });

    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(refresh, process.env.JWT_SECRET);
    const newAccess = generateAccessToken({ _id: payload.id });

    return res.json({ access: newAccess });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token.' });
  }
});

module.exports = router;

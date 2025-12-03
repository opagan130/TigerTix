const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const JWT_EXPIRY = '30m'; // 30 minutes expiration

function register(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  userModel.findUserByEmail(email, (err, user) => {
    if (user) return res.status(400).json({ error: 'User already exists' });

    userModel.createUser(email, password, (err2) => {
      if (err2) return res.status(500).json({ error: 'Registration failed' });
      return res.json({ success: true, message: 'User registered successfully' });
    });
  });
}

function login(req, res) {
  const { email, password } = req.body;
  userModel.findUserByEmail(email, (err, user) => {
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    // Store as HTTP-only cookie, for 30 mins
    res.cookie('token', token, { httpOnly: true, 
      maxAge: 30 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',    // required with SameSite=None
      sameSite: process.env.NODE_ENV === 'production'
        ? 'none'                                        // allow cross-site (Vercel → Render)
        : 'lax',  });
    return res.json({ success: true, token, email: user.email });
  });
}

function logout(req, res) {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logged out successfully' });
}

module.exports = { register, login, logout };

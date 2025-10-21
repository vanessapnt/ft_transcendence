const express = require('express');
const bcrypt = require('bcryptjs');
const { statements } = require('../database');

const router = express.Router();

// Input validation helper
const validateUserInput = (username, email, password) => {
  const errors = [];

  if (!username || username.length < 3 || username.length > 50) {
    errors.push('Username must be between 3 and 50 characters');
  }

  if (!email || !email.includes('@')) {
    errors.push('Valid email is required');
  }

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  return errors;
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    const errors = validateUserInput(username, email, password);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Check if user already exists
    const existingUser = statements.getUserByUsername.get(username) ||
                        statements.getUserByEmail.get(email);

    if (existingUser) {
      return res.status(409).json({
        error: existingUser.username === username ?
               'Username already taken' : 'Email already registered'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = statements.createUser.run(username, email, passwordHash, null, null);
    const user = statements.getUserById.get(result.lastInsertRowid);

    // Set session
    req.session.userId = user.id;

    // Return user data (without password)
    const { password_hash, ...userData } = user;
    res.status(201).json({
      message: 'User registered successfully',
      user: userData
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const user = statements.getUserByUsername.get(username);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set session
    req.session.userId = user.id;

    // Return user data
    const { password_hash, ...userData } = user;
    res.json({
      message: 'Login successful',
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = statements.getUserById.get(req.session.userId);
  if (!user) {
    req.session.destroy();
    return res.status(401).json({ error: 'User not found' });
  }

  const { password_hash, ...userData } = user;
  res.json({ user: userData });
});

module.exports = router;
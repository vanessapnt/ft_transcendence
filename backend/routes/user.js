const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { statements } = require('../database');
const logger = require('../logger');

const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  console.log('🔒 requireAuth:', {
    session: req.session,
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : undefined,
    user: req.user
  });
  // Correction : synchronise userId si Passport a authentifié
  if (req.user && req.user.id && !req.session.userId) {
    req.session.userId = req.user.id;
  }
  if (!req.session.userId && !(req.isAuthenticated && req.isAuthenticated())) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with user ID
    const userId = req.session.userId;
    const extension = path.extname(file.originalname);
    const filename = `avatar_${userId}_${Date.now()}${extension}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get user profile
router.get('/profile', requireAuth, (req, res) => {
  console.log('Session at /profile:', req.session);
  console.log('User at /profile:', req.user);
  try {
    const userId = req.session.userId;
    logger.info('User profile access', { userId });
    const user = statements.getUserById.get(userId);
    if (!user) {
      logger.warn('User profile not found', { userId });
      return res.status(404).json({ error: 'User not found' });
    }

    const { password_hash, ...userData } = user;
    res.json({ user: userData });
  } catch (error) {
    logger.error('Get profile error', { error: error.message, stack: error.stack });
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile by username
router.get('/profile/:username', (req, res) => {
  try {
    const { username } = req.params;
    logger.info('Profile lookup by username', { username });
    const user = statements.getUserByUsername.get(username);
    if (!user) {
      logger.warn('User not found by username', { username });
      return res.status(404).json({ error: 'User not found' });
    }

    const { password_hash, oauth_id, oauth_provider, ...userData } = user;
    res.json({ user: userData });
  } catch (error) {
    logger.error('Get user by username error', { username: req.params.username, error: error.message });
    console.error('Get user by username error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', requireAuth, (req, res) => {
  try {
    const { username, email, display_name, preferred_language } = req.body;
    const userId = req.session.userId;

    logger.info('Profile update attempt', { userId, username, email, display_name, preferred_language });

    // Validate input
    const errors = [];
    if (username && (username.length < 3 || username.length > 50)) {
      errors.push('Username must be between 3 and 50 characters');
    }
    if (email && !email.includes('@')) {
      errors.push('Valid email is required');
    }
    if (display_name && display_name.length > 100) {
      errors.push('Display name must be 100 characters or less');
    }
    if (preferred_language && !['en', 'fr', 'es'].includes(preferred_language)) {
      errors.push('Invalid language. Must be en, fr, or es');
    }

    if (errors.length > 0) {
      logger.warn('Profile update validation failed', { userId, errors });
      return res.status(400).json({ errors });
    }

    // Check if username/email conflicts with other users
    if (username) {
      const existingUser = statements.getUserByUsername.get(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ error: 'Username already taken' });
      }
    }

    if (email) {
      const existingUser = statements.getUserByEmail.get(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    // Get current user data
    const currentUser = statements.getUserById.get(userId);
    const newUsername = username || currentUser.username;
    const newEmail = email || currentUser.email;
    const newDisplayName = display_name !== undefined ? display_name : currentUser.display_name;

    // Update user (use updateUserWithDisplayName to include display_name)
    statements.updateUserWithDisplayName.run(newUsername, newEmail, currentUser.avatar_path, newDisplayName, userId);

    // Update language séparément si fourni
    if (preferred_language) {
      statements.updateUserLanguage.run(preferred_language, userId);
    }

    // Relire l'utilisateur pour récupérer la langue effectivement stockée
    const updatedUser = statements.getUserById.get(userId);
    req.session.lang = updatedUser.preferred_language || 'en';

    // Return updated user
    const { password_hash, ...userData } = updatedUser;
    logger.info('Profile updated successfully', { userId, newUsername, newEmail, newDisplayName, newLanguage: updatedUser.preferred_language });
    res.json({
      message: 'Profile updated successfully',
      user: userData
    });

  } catch (error) {
    logger.error('Update profile error', { userId: req.session.userId, error: error.message });
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload avatar
router.post('/avatar', requireAuth, upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      logger.warn('Avatar upload failed: no file uploaded', { userId: req.session.userId });
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.session.userId;
    const avatarPath = req.file.filename;
    logger.info('Avatar upload started', { userId, filename: req.file.filename, size: req.file.size });

    // Delete old avatar if exists
    const currentUser = statements.getUserById.get(userId);
    if (currentUser.avatar_path) {
      const oldAvatarPath = path.join(__dirname, '../avatars', currentUser.avatar_path);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Update user with new avatar path
    statements.updateUserAvatar.run(avatarPath, userId);

    // Return updated user
    const updatedUser = statements.getUserById.get(userId);
    const { password_hash, ...userData } = updatedUser;
    logger.info('Avatar uploaded successfully', { userId, avatarPath });
    res.json({
      message: 'Avatar uploaded successfully',
      user: userData
    });

  } catch (error) {
    logger.error('Avatar upload error', { userId: req.session.userId, error: error.message });
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete avatar
router.delete('/avatar', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    logger.info('Avatar deletion attempt', { userId });
    const user = statements.getUserById.get(userId);

    if (!user.avatar_path) {
      logger.warn('Avatar deletion failed: no avatar exists', { userId });
      return res.status(404).json({ error: 'No avatar to delete' });
    }

    // Delete file
    const avatarPath = path.join(__dirname, '../avatars', user.avatar_path);
    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath);
    }

    // Update user
    statements.updateUserAvatar.run(null, userId);

    // Return updated user
    const updatedUser = statements.getUserById.get(userId);
    const { password_hash, ...userData } = updatedUser;
    logger.info('Avatar deleted successfully', { userId, deletedFile: user.avatar_path });
    res.json({
      message: 'Avatar deleted successfully',
      user: userData
    });

  } catch (error) {
    logger.error('Avatar delete error', { userId: req.session.userId, error: error.message });
    console.error('Avatar delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user avatar by username or 'default'
router.get('/avatar/:username', (req, res) => {
  try {
    const { username } = req.params;
    logger.info('Avatar requested', { username });

    const getDefaultAvatar = () => {
      // Use default_avatar.png
      const defaultAvatarPath = path.join(__dirname, '../avatars/default_avatar.png');
      if (fs.existsSync(defaultAvatarPath)) {
        return res.sendFile(defaultAvatarPath);
      }

      // Fallback to default.png if default_avatar.png doesn't exist
      const defaultPngPath = path.join(__dirname, '../avatars/default.png');
      if (fs.existsSync(defaultPngPath)) {
        return res.sendFile(defaultPngPath);
      }

      // Generate a simple SVG avatar as last resort
      const defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#00ff00"/>
        <circle cx="50" cy="40" r="15" fill="#000"/>
        <path d="M 30 70 Q 50 85 70 70" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round"/>
      </svg>`;
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(defaultSvg);
    };

    // Handle default avatar request
    if (username === 'default') {
      return getDefaultAvatar();
    }

    // Get user by username
    const user = statements.getUserByUsername.get(username);
    if (!user || !user.avatar_path) {
      // User doesn't exist or has no custom avatar - return default
      return getDefaultAvatar();
    }

    // User has a custom avatar - try to send it
    const avatarPath = path.join(__dirname, '../avatars', user.avatar_path);
    if (fs.existsSync(avatarPath)) {
      return res.sendFile(avatarPath);
    }

    // Avatar file doesn't exist - return default
    return getDefaultAvatar();

  } catch (error) {
    console.error('Get avatar error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { statements } = require('../database');

const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
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

// Helper pour générer l'URL d'avatar
function getAvatarUrl(user) {
  if (!user.avatar_path) return '/avatars/default_avatar.png';
  if (user.avatar_path.startsWith('http')) return user.avatar_path;
  return '/avatars/' + user.avatar_path;
}

// Get user profile
router.get('/profile', requireAuth, (req, res) => {
  try {
    const user = statements.getUserById.get(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { password_hash, ...userData } = user;
    userData.avatar_url = getAvatarUrl(user);
    res.json(userData);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', requireAuth, (req, res) => {
  try {
    const { username, email, display_name } = req.body;
    const userId = req.session.userId;

    // Validate input
    const errors = [];
    if (username && (username.length < 3 || username.length > 50)) {
      errors.push('Username must be between 3 and 50 characters');
    }
    if (email && !email.includes('@')) {
      errors.push('Valid email is required');
    }

    if (errors.length > 0) {
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
    const newDisplayName = display_name || currentUser.display_name;

    // Update user
    statements.updateUserWithDisplayName.run(newUsername, newEmail, currentUser.avatar_path, newDisplayName, userId);

    // Return updated user
    const updatedUser = statements.getUserById.get(userId);
    const { password_hash, ...userData } = updatedUser;
    userData.avatar_url = getAvatarUrl(updatedUser);
    res.json({
      message: 'Profile updated successfully',
      ...userData
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload avatar
router.post('/avatar', requireAuth, upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.session.userId;
    const avatarPath = req.file.filename;

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
    userData.avatar_url = getAvatarUrl(updatedUser);
    res.json({
      message: 'Avatar uploaded successfully',
      ...userData
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete avatar
router.delete('/avatar', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const user = statements.getUserById.get(userId);

    if (!user.avatar_path) {
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
    userData.avatar_url = getAvatarUrl(updatedUser);
    res.json({
      message: 'Avatar deleted successfully',
      ...userData
    });

  } catch (error) {
    console.error('Avatar delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
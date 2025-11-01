const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { statements } = require('../database');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Function to download and save OAuth avatar locally
async function downloadAvatar(url, userId, provider, currentUser = null) {
  if (!url) return null;

  try {
    // For Google, increase image size from s96-c to s400-c for better quality
    if (provider === 'google' && url.includes('googleusercontent.com')) {
      url = url.replace(/=s\d+-c/, '=s400-c');
    }

    const avatarsDir = path.join(__dirname, '../avatars');
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }

    // Delete old OAuth avatar if it exists (only if it's a local file, not a URL)
    if (currentUser && currentUser.avatar_path &&
      !currentUser.avatar_path.startsWith('http') &&
      currentUser.avatar_path.includes(`avatar_${provider}_`)) {
      const oldAvatarPath = path.join(avatarsDir, currentUser.avatar_path);
      if (fs.existsSync(oldAvatarPath)) {
        try {
          fs.unlinkSync(oldAvatarPath);
          console.log(`🗑️ Deleted old avatar: ${currentUser.avatar_path}`);
        } catch (err) {
          console.error('Error deleting old avatar:', err);
        }
      }
    }

    const filename = `avatar_${provider}_${userId}_${Date.now()}.jpg`;
    const filepath = path.join(avatarsDir, filename);

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          console.error(`Failed to download avatar: ${response.statusCode}`);
          resolve(null);
          return;
        }

        const fileStream = fs.createWriteStream(filepath);
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`✅ Avatar downloaded: ${filename}`);
          resolve(filename);
        });

        fileStream.on('error', (err) => {
          console.error('Error saving avatar:', err);
          fs.unlink(filepath, () => { });
          resolve(null);
        });
      }).on('error', (err) => {
        console.error('Error downloading avatar:', err);
        resolve(null);
      });
    });
  } catch (error) {
    console.error('Avatar download error:', error);
    return null;
  }
}

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = statements.getUserById.get(id);
  done(null, user);
});
console.log("GitHub OAuth callbackURL:", process.env.GITHUB_CALLBACK_URL || "http://localhost:8080/api/oauth/callback/github");

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:8080/api/oauth/callback/github"
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this GitHub ID
      let user = statements.getUserByOAuth.get('github', profile.id);

      const avatarUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;

      if (user) {
        // Download and save avatar locally
        const localAvatarPath = await downloadAvatar(avatarUrl, user.id, 'github', user);

        // Update user info (display_name, avatar) at each login
        statements.updateUserWithDisplayName.run(
          user.username,
          user.email,
          localAvatarPath || avatarUrl, // Use local path if download succeeded
          profile.displayName || user.username,
          user.id
        );
        user = statements.getUserById.get(user.id);
        return done(null, user);
      }

      // Check if user exists with same email
      if (profile.emails && profile.emails.length > 0) {
        user = statements.getUserByEmail.get(profile.emails[0].value);
        if (user) {
          // Download and save avatar locally
          const localAvatarPath = await downloadAvatar(avatarUrl, user.id, 'github', user);

          // Link GitHub account to existing user (update avatar and display_name)
          statements.updateUserWithDisplayName.run(
            user.username,
            user.email,
            localAvatarPath || avatarUrl,
            profile.displayName || user.username,
            user.id
          );
          user = statements.getUserById.get(user.id);
          return done(null, user);
        }
      }

      // Create new user
      const username = profile.username || profile.displayName || `github_${profile.id}`;
      const email = profile.emails && profile.emails.length > 0 ?
        profile.emails[0].value : `${profile.id}@github.local`;

      const result = statements.createUser.run(
        username,
        email,
        null, // no password for OAuth users
        'github',
        profile.id
      );

      // Download and save avatar locally for new user
      const localAvatarPath = await downloadAvatar(avatarUrl, result.lastInsertRowid, 'github');

      // Ajoute le display_name et l'avatar juste après la création
      statements.updateUserWithDisplayName.run(
        username,
        email,
        localAvatarPath || avatarUrl, // Use local path if download succeeded
        profile.displayName || username,
        result.lastInsertRowid
      );

      user = statements.getUserById.get(result.lastInsertRowid);
      return done(null, user);

    } catch (error) {
      console.error('GitHub OAuth error:', error);
      return done(error, null);
    }
  }
));

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:8080/api/oauth/callback/google"
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this Google ID
      let user = statements.getUserByOAuth.get('google', profile.id);

      const avatarUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;

      if (user) {
        // Download and save avatar locally
        const localAvatarPath = await downloadAvatar(avatarUrl, user.id, 'google', user);

        // Update user info (display_name, avatar) at each login
        statements.updateUserWithDisplayName.run(
          user.username,
          user.email,
          localAvatarPath || avatarUrl, // Use local path if download succeeded, otherwise fallback to URL
          profile.displayName || user.username,
          user.id
        );
        user = statements.getUserById.get(user.id);
        return done(null, user);
      }

      // Check if user exists with same email
      if (profile.emails && profile.emails.length > 0) {
        user = statements.getUserByEmail.get(profile.emails[0].value);
        if (user) {
          // Download and save avatar locally
          const localAvatarPath = await downloadAvatar(avatarUrl, user.id, 'google', user);

          // Link Google account to existing user (update avatar and display_name)
          statements.updateUserWithDisplayName.run(
            user.username,
            user.email,
            localAvatarPath || avatarUrl,
            profile.displayName || user.username,
            user.id
          );
          user = statements.getUserById.get(user.id);
          return done(null, user);
        }
      }

      // Create new user
      const username = profile.displayName || `google_${profile.id}`;
      const email = profile.emails && profile.emails.length > 0 ?
        profile.emails[0].value : `${profile.id}@google.local`;

      const result = statements.createUser.run(
        username,
        email,
        null, // no password for OAuth users
        'google',
        profile.id
      );

      // Download and save avatar locally for new user
      const localAvatarPath = await downloadAvatar(avatarUrl, result.lastInsertRowid, 'google');

      // Ajoute le display_name et l'avatar juste après la création
      statements.updateUserWithDisplayName.run(
        username,
        email,
        localAvatarPath || avatarUrl, // Use local path if download succeeded
        profile.displayName || username,
        result.lastInsertRowid
      );

      user = statements.getUserById.get(result.lastInsertRowid);
      return done(null, user);

    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }
));

// GitHub OAuth routes
router.get('/login/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

// Google OAuth
router.get('/login/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/callback/github',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    console.log('✅ Authenticated user:', req.user);
    // Redirection dynamique selon l'environnement
    const frontendUrl = process.env.FRONTEND_URL || 'https://localhost:8443';
    res.redirect(frontendUrl);
  }
);

router.get('/callback/google',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'https://localhost:8443';
    res.redirect(frontendUrl);
  }
);

// Logout from OAuth (same as regular logout)
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('OAuth logout error:', err);
      return res.status(500).json({ error: 'Could not log out' });
    }
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'Could not destroy session' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });
});

module.exports = router;
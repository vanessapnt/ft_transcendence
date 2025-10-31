const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { statements } = require('../database');

const router = express.Router();

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
        // Update user info (display_name, avatar) at each login
        statements.updateUserWithDisplayName.run(
          user.username,
          user.email,
          avatarUrl, // avatar_path
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
          // Link GitHub account to existing user (update avatar and display_name)
          statements.updateUserWithDisplayName.run(
            user.username,
            user.email,
            avatarUrl,
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

      // Ajoute le display_name et l'avatar juste après la création
      statements.updateUserWithDisplayName.run(
        username,
        email,
        avatarUrl, // avatar_path
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
        // Update user info (display_name, avatar) at each login
        statements.updateUserWithDisplayName.run(
          user.username,
          user.email,
          avatarUrl,
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
          // Link Google account to existing user (update avatar and display_name)
          statements.updateUserWithDisplayName.run(
            user.username,
            user.email,
            avatarUrl,
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

      // Ajoute le display_name et l'avatar juste après la création
      statements.updateUserWithDisplayName.run(
        username,
        email,
        avatarUrl,
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
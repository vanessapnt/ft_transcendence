const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const { statements } = require('../database');

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://localhost:8443/';

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:8000/api/oauth/callback/github"
},
  (accessToken, refreshToken, profile, done) => {
    try {
      // DEBUG: log le profil GitHub reçu par passport
      console.log('GitHub profile:', JSON.stringify(profile, null, 2));

      // Check if user already exists with this GitHub ID
      let user = statements.getUserByOAuth.get('github', profile.id);
      const avatarUrl = (profile.photos && profile.photos.length > 0 && profile.photos[0].value) ? profile.photos[0].value : (user && user.avatar_path ? user.avatar_path : null);
      const displayName = profile.displayName || (user && user.display_name) || (user && user.username) || null;

      if (user) {
        // Update user info (display_name, avatar) at each login, sans jamais écraser username/email
        let displayName = profile.displayName;
        if (!displayName || displayName === 'null') displayName = user.username;
        let avatarUrl = (profile.photos && profile.photos.length > 0 && profile.photos[0].value) ? profile.photos[0].value : user.avatar_path;
        statements.updateUserWithDisplayName.run(
          user.username,
          user.email,
          avatarUrl,
          displayName,
          user.id
        );
        user = statements.getUserById.get(user.id);
        return done(null, user);
      }

      // Check if user exists with same email
      if (profile.emails && profile.emails.length > 0) {
        user = statements.getUserByEmail.get(profile.emails[0].value);
        if (user) {
          const avatarUrl = (profile.photos && profile.photos.length > 0 && profile.photos[0].value) ? profile.photos[0].value : user.avatar_path;
          const displayName = profile.displayName || user.display_name || user.username;
          // Link GitHub account to existing user (update avatar and display_name)
          statements.updateUserWithDisplayName.run(
            user.username,
            user.email,
            avatarUrl,
            displayName,
            user.id
          );
          user = statements.getUserById.get(user.id);
          return done(null, user);
        }
      }

      // Create new user
      // Sanitize username and display_name to avoid null or 'null'
      let username = profile.username;
      if (!username || username === 'null') username = `github_${profile.id}`;
      let finalDisplayName = profile.displayName;
      if (!finalDisplayName || finalDisplayName === 'null') finalDisplayName = username;
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
        finalDisplayName,
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

// GitHub OAuth routes
router.get('/login/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

router.get('/callback/github',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    // Force la session à être liée à l'utilisateur après login
    if (req.user && req.session) {
      req.login(req.user, (err) => {
        if (err) {
          console.error('Passport login error:', err);
          return res.redirect(FRONTEND_URL);
        }

        // S'assurer que userId est dans la session
        req.session.userId = req.user.id;
        req.session._force = Date.now(); // Mark session as modified

        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
          } else {
            console.log('Session saved successfully after OAuth login');
          }

          // Rediriger vers une page de confirmation ou la homepage
          console.log('OAuth login successful, redirecting to:', FRONTEND_URL);
          res.redirect(FRONTEND_URL);
        });
      });
    } else {
      res.redirect(FRONTEND_URL);
    }
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
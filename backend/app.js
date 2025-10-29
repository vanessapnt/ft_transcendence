const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

console.log('==> [APP.JS] FRONTEND_URL (startup):', process.env.FRONTEND_URL);

const { statements } = require('./database');

const app = express();
const PORT = process.env.PORT || 8000;

console.log('==> [APP.JS] Backend app.js loaded and running');

// Middleware
app.use(cors({
  origin: ['https://localhost:8443'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware: log cookies on every request
app.use((req, res, next) => {
  console.log('==> [COOKIE DEBUG] Incoming cookies:', req.headers.cookie);
  next();
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'transcendence-secret-key',
  resave: false,
  saveUninitialized: true, // Temporarily force session cookie to be set
  cookie: {
    sameSite: 'None', // Capital N for compatibility
    secure: true,     // IMPORTANT: true en prod HTTPS
    path: '/',        // Explicitly set path
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());


// Passport serialization
passport.serializeUser((user, done) => {
  console.log('PASSPORT serializeUser [app.js]:', user);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = statements.getUserById.get(id);
  console.log('PASSPORT deserializeUser [app.js]: id', id, 'user', user);
  console.log('PASSPORT deserializeUser [app.js]:', user);
  done(null, user);
});

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost/api/oauth/callback/github"
},
  (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this GitHub ID
      let user = statements.getUserByOAuth.get('github', profile.id);

      if (user) {
        // Update user info if needed
        return done(null, user);
      }

      // Check if user exists with same email
      if (profile.emails && profile.emails.length > 0) {
        user = statements.getUserByEmail.get(profile.emails[0].value);
        if (user) {
          // Link GitHub account to existing user
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

      user = statements.getUserById.get(result.lastInsertRowid);
      return done(null, user);

    } catch (error) {
      console.error('GitHub OAuth error:', error);
      return done(error, null);
    }
  }
));

// GitHub OAuth routes
app.get('/api/oauth/login/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/api/oauth/callback/github',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication
    res.redirect(process.env.FRONTEND_URL || 'https://localhost:8443/');
  }
);

// Logout from OAuth (same as regular logout)
app.post('/api/oauth/logout', (req, res) => {
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

// Static files for avatars
const avatarsDir = path.join(__dirname, 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
app.use('/avatars', express.static(avatarsDir));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Synchronise la session pour les utilisateurs OAuth (GitHub)
app.use((req, res, next) => {
  console.log('SESSION SYNC MIDDLEWARE:', {
    sessionUserId: req.session.userId,
    passportUser: req.user ? req.user.id : 'none'
  });

  // Si Passport a un user mais pas la session
  if (req.user && !req.session.userId) {
    req.session.userId = req.user.id;
    console.log('SYNC: Added userId to session:', req.user.id);
  }

  // Si la session a un userId mais Passport n'a pas de user
  if (req.session.userId && !req.user) {
    const user = statements.getUserById.get(req.session.userId);
    if (user) {
      req.login(user, (err) => {
        if (err) console.error('Auto-login error:', err);
        else console.log('SYNC: Auto-logged in user from session:', user.id);
        next();
      });
      return;
    }
  }

  next();
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});

module.exports = app;
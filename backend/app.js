const express = require('express');
const http = require('http');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { statements } = require('./database');
const { setupChat } = require('./chat');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost',
    'https://localhost:8443'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'transcendence-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Static files for avatars - copier votre default_avatar.png
const avatarsDir = path.join(__dirname, 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Copier votre default_avatar.png depuis la racine du backend
const defaultAvatarPath = path.join(avatarsDir, 'default_avatar.png');
const sourceAvatarPath = path.join(__dirname, 'default_avatar.png');

if (fs.existsSync(sourceAvatarPath) && !fs.existsSync(defaultAvatarPath)) {
  fs.copyFileSync(sourceAvatarPath, defaultAvatarPath);
  console.log('✅ Votre default_avatar.png copié');
}

console.log('✅ Dossier avatars configuré');
app.use('/avatars', express.static(avatarsDir));

// Static files for public folder (lang.js, etc)
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use(express.static(publicDir));

// Routes
const i18nRouter = require('./routes/change_lang');
app.use('/api/change_lang', i18nRouter);
const i18nRoute = require('./routes/i18n');
app.use('/api/i18n', i18nRoute);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/oauth', require('./routes/oauth'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Créer le serveur HTTP
const server = http.createServer(app);

// Initialiser le chat WebSocket
setupChat(server);

server.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});

module.exports = app;
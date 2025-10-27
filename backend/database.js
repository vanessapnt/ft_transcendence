const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'transcendence.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
const createTables = () => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      avatar_path TEXT,
      display_name TEXT,
      oauth_provider TEXT,
      oauth_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sessions table (optional, for persistent sessions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expire INTEGER NOT NULL
    )
  `);

  console.log('✅ Database tables created/verified');
};

// Initialize database
createTables();

// Add display_name column if missing (migration)
try {
  db.prepare('ALTER TABLE users ADD COLUMN display_name TEXT').run();
  console.log('✅ Migrated: Added display_name column');
} catch (e) {
  if (!String(e).includes('duplicate column name')) {
    console.error('Migration error:', e);
  }
}

// Prepared statements for better performance
const statements = {
  // User operations
  createUser: db.prepare(`
    INSERT INTO users (username, email, password_hash, oauth_provider, oauth_id)
    VALUES (?, ?, ?, ?, ?)
  `),

  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  getUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  getUserByOAuth: db.prepare('SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?'),

  updateUser: db.prepare(`
    UPDATE users
    SET username = ?, email = ?, avatar_path = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  updateUserWithDisplayName: db.prepare(`
    UPDATE users
    SET username = ?, email = ?, avatar_path = ?, display_name = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  updateUserAvatar: db.prepare(`
    UPDATE users
    SET avatar_path = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),

  // Session operations
  getSession: db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expire > ?'),
  setSession: db.prepare('INSERT OR REPLACE INTO sessions (sid, sess, expire) VALUES (?, ?, ?)'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE sid = ?'),
  deleteExpiredSessions: db.prepare('DELETE FROM sessions WHERE expire <= ?')
};

module.exports = {
  db,
  statements
};
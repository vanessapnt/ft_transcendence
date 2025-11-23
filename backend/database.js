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

  // Messages table for chat persistence
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      message_text TEXT NOT NULL,
      message_type TEXT DEFAULT 'dm',
      is_delivered BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      delivered_at DATETIME,
      FOREIGN KEY (from_user_id) REFERENCES users(id),
      FOREIGN KEY (to_user_id) REFERENCES users(id)
    )
  `);

  // Friends table for bidirectional friendships
  db.exec(`
    CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      friend_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (friend_id) REFERENCES users(id),
      UNIQUE(user_id, friend_id)
    )
  `);

  // Matches table for storing game history
  db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1_id INTEGER NOT NULL,
      player2_id INTEGER NOT NULL,
      winner_id INTEGER,
      player1_score INTEGER DEFAULT 0,
      player2_score INTEGER DEFAULT 0,
      match_type TEXT DEFAULT 'duel',
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player1_id) REFERENCES users(id),
      FOREIGN KEY (player2_id) REFERENCES users(id),
      FOREIGN KEY (winner_id) REFERENCES users(id)
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

// Add preferred_language column if missing (migration)
try {
  db.prepare('ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT "en"').run();
  console.log('✅ Migrated: Added preferred_language column');
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
  getAllUsers: db.prepare('SELECT id, username, email, display_name, avatar_path, created_at FROM users ORDER BY username'),

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

  updateUserLanguage: db.prepare(`
    UPDATE users
    SET preferred_language = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),

  // Session operations
  getSession: db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expire > ?'),
  setSession: db.prepare('INSERT OR REPLACE INTO sessions (sid, sess, expire) VALUES (?, ?, ?)'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE sid = ?'),
  deleteExpiredSessions: db.prepare('DELETE FROM sessions WHERE expire <= ?'),

  // Message operations
  saveMessage: db.prepare(`
    INSERT INTO messages (from_user_id, to_user_id, message_text, message_type, is_delivered)
    VALUES (?, ?, ?, ?, ?)
  `),

  getUndeliveredMessages: db.prepare(`
    SELECT m.*, u_from.username as from_username, u_from.display_name as from_display_name
    FROM messages m
    JOIN users u_from ON m.from_user_id = u_from.id
    WHERE m.to_user_id = ? AND m.is_delivered = 0
    ORDER BY m.created_at ASC
  `),

  markMessageAsDelivered: db.prepare(`
    UPDATE messages SET is_delivered = 1, delivered_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  getConversationHistory: db.prepare(`
    SELECT m.*, 
           u_from.username as from_username, u_from.display_name as from_display_name,
           u_to.username as to_username, u_to.display_name as to_display_name
    FROM messages m
    JOIN users u_from ON m.from_user_id = u_from.id
    JOIN users u_to ON m.to_user_id = u_to.id
    WHERE (m.from_user_id = ? AND m.to_user_id = ?) OR (m.from_user_id = ? AND m.to_user_id = ?)
    ORDER BY m.created_at ASC
    LIMIT 50
  `),

  // Friend operations
  isFriend: db.prepare('SELECT COUNT(*) as count FROM friends WHERE user_id = ? AND friend_id = ?'),
  addFriend: db.prepare('INSERT INTO friends (user_id, friend_id) VALUES (?, ?)'),
  removeFriend: db.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ?'),
  getFriends: db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_path
    FROM friends f
    JOIN users u ON f.friend_id = u.id
    WHERE f.user_id = ?
    GROUP BY u.id
  `),

  // Match operations
  saveMatch: db.prepare(`
    INSERT INTO matches (player1_id, player2_id, winner_id, player1_score, player2_score, match_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  getUserMatches: db.prepare(`
    SELECT m.*,
           u1.username as player1_username, u1.display_name as player1_display_name,
           u2.username as player2_username, u2.display_name as player2_display_name,
           uw.username as winner_username
    FROM matches m
    JOIN users u1 ON m.player1_id = u1.id
    JOIN users u2 ON m.player2_id = u2.id
    LEFT JOIN users uw ON m.winner_id = uw.id
    WHERE m.player1_id = ? OR m.player2_id = ?
    ORDER BY m.played_at DESC
    LIMIT 50
  `),

  getUserMatchStats: db.prepare(`
    SELECT 
      COUNT(*) as total_matches,
      SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN winner_id IS NULL THEN 1 ELSE 0 END) as draws,
      SUM(CASE WHEN winner_id != ? AND winner_id IS NOT NULL THEN 1 ELSE 0 END) as losses
    FROM matches
    WHERE player1_id = ? OR player2_id = ?
  `)
};

module.exports = {
  db,
  statements
};
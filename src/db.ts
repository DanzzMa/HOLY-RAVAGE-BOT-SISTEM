import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'nexus.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS guilds (
    id TEXT PRIMARY KEY,
    name TEXT,
    welcome_enabled INTEGER DEFAULT 0,
    welcome_channel_id TEXT,
    welcome_message TEXT DEFAULT 'Welcome {user} to the server!',
    welcome_image_url TEXT,
    welcome_embed_title TEXT DEFAULT 'Welcome!',
    welcome_embed_color TEXT DEFAULT '#5865F2',
    auto_role_enabled INTEGER DEFAULT 0,
    auto_role_id TEXT,
    mod_log_channel_id TEXT,
    mute_role_id TEXT,
    automod_enabled INTEGER DEFAULT 0,
    leveling_enabled INTEGER DEFAULT 0,
    prefix TEXT DEFAULT '!',
    leave_enabled INTEGER DEFAULT 0,
    leave_channel_id TEXT,
    leave_message TEXT DEFAULT '{user} has left the server.',
    xp_per_message INTEGER DEFAULT 10
  );

  CREATE TABLE IF NOT EXISTS custom_commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    command_name TEXT NOT NULL,
    response TEXT NOT NULL,
    is_embed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    guild_id TEXT,
    user_id TEXT,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    last_xp_gain INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS dropdown_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    channel_id TEXT,
    message_id TEXT,
    title TEXT,
    description TEXT,
    roles TEXT -- JSON array of { label, value (id), emoji }
  );
`);

// Migration for existing databases
const tableInfo = db.prepare("PRAGMA table_info(guilds)").all() as any[];
const columns = tableInfo.map(c => c.name);

const missingColumns = [
  { name: 'welcome_image_url', type: 'TEXT' },
  { name: 'welcome_embed_title', type: "TEXT DEFAULT 'Welcome!'" },
  { name: 'welcome_embed_color', type: "TEXT DEFAULT '#5865F2'" },
  { name: 'mod_log_channel_id', type: 'TEXT' },
  { name: 'mute_role_id', type: 'TEXT' },
  { name: 'automod_enabled', type: 'INTEGER DEFAULT 0' },
  { name: 'leveling_enabled', type: 'INTEGER DEFAULT 0' },
  { name: 'leave_enabled', type: 'INTEGER DEFAULT 0' },
  { name: 'leave_channel_id', type: 'TEXT' },
  { name: 'leave_message', type: "TEXT DEFAULT '{user} has left the server.'" },
  { name: 'xp_per_message', type: 'INTEGER DEFAULT 10' }
];

for (const column of missingColumns) {
  if (!columns.includes(column.name)) {
    try {
      db.exec(`ALTER TABLE guilds ADD COLUMN ${column.name} ${column.type}`);
    } catch (err) {
      console.error(`Failed to add column ${column.name}:`, err);
    }
  }
}

export default db;

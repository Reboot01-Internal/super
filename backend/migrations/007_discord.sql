PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN discord_user_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_discord_user_id
ON users(discord_user_id)
WHERE discord_user_id IS NOT NULL AND TRIM(discord_user_id) <> '';

CREATE TABLE IF NOT EXISTS board_discord_channels (
  board_id INTEGER PRIMARY KEY,
  channel_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

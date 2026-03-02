-- migrations/002_activity.sql

CREATE TABLE IF NOT EXISTS card_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL,
  actor_user_id INTEGER,
  action TEXT NOT NULL,
  meta TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY(card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_card_activity_card_id_created_at
ON card_activity(card_id, created_at DESC);
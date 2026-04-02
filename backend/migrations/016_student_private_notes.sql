CREATE TABLE IF NOT EXISTS student_private_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_user_id INTEGER NOT NULL,
  author_user_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_student_private_notes_student_created
ON student_private_notes(student_user_id, created_at DESC, id DESC);

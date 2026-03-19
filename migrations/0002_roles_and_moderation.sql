PRAGMA foreign_keys = ON;

-- Expand users.role to allow 'organizer'
-- SQLite/D1 requires rebuilding the table to change CHECK constraints.
BEGIN TRANSACTION;

CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'organizer', 'admin')),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users_new (id, email, name, role, password_hash, password_salt, created_at, updated_at)
SELECT id, email, name, role, password_hash, password_salt, created_at, updated_at
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

COMMIT;

-- Add moderation fields to events (approval -> auto publish)
-- Existing rows become approved by default.
ALTER TABLE events ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'approved'
  CHECK (moderation_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE events ADD COLUMN approved_at TEXT;
ALTER TABLE events ADD COLUMN approved_by_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_events_moderation_status ON events(moderation_status);
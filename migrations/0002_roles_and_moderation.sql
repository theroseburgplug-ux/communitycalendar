-- 0002_roles_and_moderation.sql
-- Expand users.role to allow 'organizer' and add moderation fields to events.
-- Because sessions.user_id and events.created_by_id reference users(id),
-- we must rebuild tables in a controlled way with foreign keys disabled.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- 1) Rebuild users with updated CHECK constraint.
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

-- 2) Rebuild sessions (to refresh FK reference after users swap).
CREATE TABLE sessions_new (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users_new(id) ON DELETE CASCADE
);

INSERT INTO sessions_new (token, user_id, expires_at, created_at)
SELECT token, user_id, expires_at, created_at
FROM sessions;

-- 3) Rebuild events and add moderation fields at the same time.
CREATE TABLE events_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT,
  all_day INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  organizer TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  moderation_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  approved_at TEXT,
  approved_by_id INTEGER,
  event_type_id INTEGER NOT NULL,
  created_by_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_id) REFERENCES users_new(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by_id) REFERENCES users_new(id) ON DELETE SET NULL
);

INSERT INTO events_new (
  id, title, slug, description, start_at, end_at, all_day, location, organizer,
  status, visibility, event_type_id, created_by_id, created_at, updated_at,
  moderation_status, approved_at, approved_by_id
)
SELECT
  id, title, slug, description, start_at, end_at, all_day, location, organizer,
  status, visibility, event_type_id, created_by_id, created_at, updated_at,
  'approved', NULL, NULL
FROM events;

-- 4) Drop old tables and rename new ones.
DROP TABLE events;
DROP TABLE sessions;
DROP TABLE users;

ALTER TABLE users_new RENAME TO users;
ALTER TABLE sessions_new RENAME TO sessions;
ALTER TABLE events_new RENAME TO events;

COMMIT;
PRAGMA foreign_keys = ON;

-- 5) Recreate indexes that were on the old tables.
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_events_moderation_status ON events(moderation_status);
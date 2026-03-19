PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#f08c3c',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
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
  event_type_id INTEGER NOT NULL,
  created_by_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

INSERT OR IGNORE INTO event_types (id, name, slug, color) VALUES
  (1, 'Community', 'community', '#f08c3c'),
  (2, 'Business', 'business', '#38bdf8'),
  (3, 'Family', 'family', '#a78bfa'),
  (4, 'Arts', 'arts', '#34d399');

INSERT OR IGNORE INTO users (id, email, name, role, password_hash, password_salt) VALUES
  (1, 'admin@example.com', 'Admin User', 'admin', 'c21be597dba19c42f6b41a08aa12e20b99db90fcff8d89c2adea3dd4cb6ff43d', 'dev-salt-123');

INSERT OR IGNORE INTO events (
  id, title, slug, description, start_at, end_at, all_day, location, organizer, status, visibility, event_type_id, created_by_id
) VALUES
  (
    1,
    'Downtown Spring Market',
    'downtown-spring-market',
    'A sample seeded event so the calendar has data on first boot.',
    '2026-04-04T17:00:00.000Z',
    '2026-04-04T21:00:00.000Z',
    0,
    'Downtown Plaza',
    'City Events Team',
    'published',
    'public',
    1,
    1
  );

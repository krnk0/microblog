-- Followers table for ActivityPub
-- Stores actors who follow this account
CREATE TABLE IF NOT EXISTS followers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT NOT NULL UNIQUE,    -- Remote actor's AP ID (e.g., https://mastodon.social/users/foo)
  inbox_url TEXT NOT NULL,          -- Remote actor's inbox URL for delivery
  shared_inbox_url TEXT,            -- Shared inbox for efficiency (optional)
  created_at TEXT NOT NULL          -- ISO 8601 UTC
);

-- Index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_followers_actor_id ON followers(actor_id);

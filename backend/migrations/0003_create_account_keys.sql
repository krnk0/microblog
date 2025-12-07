-- Account keys for ActivityPub (RSA key pairs stored as JWK)
CREATE TABLE IF NOT EXISTS account_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  rsa_public_key TEXT NOT NULL,
  rsa_private_key TEXT NOT NULL,
  created_at TEXT NOT NULL
);

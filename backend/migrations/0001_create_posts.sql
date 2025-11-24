-- 投稿テーブル
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- インデックス（日付順で取得するため）
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

# Microblog Backend

Cloudflare Workers + D1によるマイクロブログAPI

## セットアップ

```bash
# 依存関係のインストール
npm install

# ローカルD1データベースにマイグレーション実行
npm run db:migrate:local
```

## 開発

```bash
# 開発サーバー起動（http://localhost:8787）
npm run dev
```

## API エンドポイント

### `GET /api/posts`
投稿一覧を取得（最新50件）

```bash
curl http://localhost:8787/api/posts
```

### `POST /api/posts`
新しい投稿を作成（要認証）

```bash
curl -X POST http://localhost:8787/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-password-change-me" \
  -d '{"content": "Hello, World!"}'
```

## 認証

- ローカル開発: `.dev.vars` の `AUTH_PASSWORD` を使用
- 本番環境: `wrangler secret put AUTH_PASSWORD` でシークレットを設定

## デプロイ

```bash
# D1データベース作成（初回のみ）
npm run db:create

# 本番D1にマイグレーション実行
npm run db:migrate:remote

# デプロイ
npm run deploy
```

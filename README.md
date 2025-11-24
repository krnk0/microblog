# Microblog

ActivityPub対応のマイクロブログ

## 技術スタック

- **Frontend**: Next.js (Cloudflare Pages)
- **Backend**: Cloudflare Workers + D1 + R2
- **Protocol**: ActivityPub, WebFinger, HTTP Signatures

## プロジェクト構造

```
microblog/
├── backend/      Cloudflare Workers API
├── frontend/     Next.js UI
└── shared/       共通の型定義
```

## 開発

```bash
# 依存関係のインストール
npm install
cd backend && npm install
cd ../frontend && npm install

# D1データベースのマイグレーション（初回のみ）
cd backend
npm run db:migrate:local

# 開発サーバー起動（ルートディレクトリから）
cd ..
npm run dev

# または個別に起動
npm run dev:backend  # http://localhost:8787
npm run dev:frontend # http://localhost:3001
```

アクセス: http://localhost:3001

## デプロイ

```bash
# バックエンド
npm run deploy:backend

# フロントエンド
npm run deploy:frontend
```

## Phase 1: ローカルマイクロブログ

- [x] プロジェクトセットアップ（モノレポ構成）
- [x] 投稿作成・一覧表示API
- [x] シンプルな認証（Bearer Token）
- [x] UI（投稿フォーム + タイムライン）
- [x] ブログと同じダークテーマ適用
- [ ] ローカル動作確認

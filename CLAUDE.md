# Microblog Project

Personal microblog powered by Cloudflare Workers + D1 + Pages.

## Architecture

- **Frontend**: Next.js (Static Export) → Cloudflare Pages (`https://mb.krnk.app`)
- **Backend**: Cloudflare Workers + Hono (`https://mb-api.krnk.app`)
- **Database**: Cloudflare D1 (SQLite)
- **Auth**: JWT in HttpOnly Cookie (7-day expiration)

## Important: Backup Before Destructive Operations

Before any destructive database operations (migrations, schema changes, bulk deletes), take a backup:

```bash
cd backend

# Export SQL dump
npx wrangler d1 export microblog-db --output=backup-$(date +%Y%m%d-%H%M%S).sql

# Or check current state with Time Travel
npx wrangler d1 time-travel info microblog-db
```

### Restore from Time Travel (if something goes wrong)

```bash
# Restore to specific timestamp
npx wrangler d1 time-travel restore microblog-db --timestamp="2025-12-03T00:00:00Z"

# Or restore to specific bookmark
npx wrangler d1 time-travel restore microblog-db --bookmark="<bookmark-id>"
```

## Deploy

```bash
# Backend (Cloudflare Workers)
cd backend
npm run deploy

# Frontend (auto-deploys on git push via Cloudflare Pages)
git push
```

## Local Development

```bash
# Start both frontend and backend
cd backend && npm run dev    # http://localhost:8787
cd frontend && npm run dev   # http://localhost:3000

# Apply migrations to local DB
cd backend && npm run db:migrate:local
```

## Database

Table: `posts`
- `id`: INTEGER PRIMARY KEY
- `content`: TEXT NOT NULL
- `created_at`: TEXT (ISO 8601 UTC format with "Z" suffix)

# Microblog Project

Personal microblog powered by Cloudflare Workers + D1 + Pages.

## Tech Stack

**Frontend** (`/frontend`)
- Next.js 16 (Static Export) → Cloudflare Pages
- React 19, Tailwind CSS 4
- PrismJS (syntax highlighting), KaTeX (math rendering)

**Backend** (`/backend`)
- Cloudflare Workers (vanilla, no framework)
- Preact + preact-render-to-string (SSR for post pages)
- jose (JWT authentication)
- Vitest (testing)

**Infrastructure**
- Database: Cloudflare D1 (SQLite)
- Storage: Cloudflare R2 (media uploads)
- Auth: JWT in HttpOnly Cookie (7-day expiration)

## URLs

- Production: `https://mb.krnk.app`
- API: `https://mb-api.krnk.app` (same worker, different domain)

## Local Development

```bash
# Backend (API + post pages)
cd backend && npm run dev    # http://localhost:8787

# Frontend (Next.js dev server)
cd frontend && npm run dev   # http://localhost:3001

# Run tests
cd backend && npm test     # Unit tests
cd frontend && npm test    # Smoke tests (requires dev servers running)
```

Note: In local dev, `/posts/:id` links from frontend (3001) will 404 because post pages are served by backend (8787). Access `http://localhost:8787/posts/:id` directly. Production works because both are on the same domain.

## Database Schema

```sql
-- Posts
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,  -- ISO 8601 UTC with "Z" suffix
  image_url TEXT             -- R2 URL for attached image
);

-- ActivityPub RSA keys
CREATE TABLE account_keys (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  rsa_public_key TEXT NOT NULL,
  rsa_private_key TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

## Deploy

```bash
# Backend (Cloudflare Workers)
cd backend && npm run deploy

# Frontend (auto-deploys on git push via Cloudflare Pages)
git push
```

## Features

- Post creation with image upload (R2)
- Syntax highlighting (PrismJS) and math rendering (KaTeX)
- ActivityPub federation (actor, inbox, outbox, followers, following)
- RSS feed (`/api/rss`)
- Admin panel with JWT auth

## Backup (Before Destructive Operations)

```bash
cd backend

# Export SQL dump
npx wrangler d1 export microblog-db --output=backup-$(date +%Y%m%d-%H%M%S).sql

# Check Time Travel state
npx wrangler d1 time-travel info microblog-db

# Restore if needed
npx wrangler d1 time-travel restore microblog-db --timestamp="2025-12-03T00:00:00Z"
```

## Project Structure

```
backend/
  src/
    index.ts          # Main router
    auth.ts           # JWT auth handlers
    posts.ts          # Post CRUD
    media.ts          # R2 upload
    feed.ts           # RSS
    activitypub/      # ActivityPub handlers
    pages/post.tsx    # SSR post page (Preact)
    __tests__/        # Vitest tests
  migrations/         # D1 SQL migrations
  .dev.vars           # Local dev secrets (AUTH_PASSWORD, JWT_SECRET)

frontend/
  app/
    page.tsx          # Timeline
    admin/page.tsx    # Admin panel
  components/         # Shared components (PostCard, PostList, Pagination)
  __tests__/          # Smoke tests (Vitest)
  public/assets/      # PrismJS, KaTeX files
```

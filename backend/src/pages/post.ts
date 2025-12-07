/**
 * Post page handler - serves HTML or ActivityPub JSON based on Accept header
 */

import type { Env, Post } from '../types';

const DOMAIN = 'mb.krnk.app';
const API_DOMAIN = 'mb.krnk.app';

/**
 * Convert database datetime to ISO 8601 format
 */
function toISO8601(datetime: string): string {
  let iso = datetime.replace(' ', 'T');
  if (!iso.endsWith('Z')) {
    iso += 'Z';
  }
  return iso;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format date for display
 */
function formatDate(datetime: string): string {
  const date = new Date(toISO8601(datetime));
  return date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

/**
 * Generate HTML page for a post
 */
function renderPostHtml(post: Post): string {
  const postUrl = `https://${DOMAIN}/posts/${post.id}`;
  const escaped = escapeHtml(post.content);
  const contentHtml = escaped.replace(/\n/g, '<br>');
  const description = post.content.slice(0, 200).replace(/\n/g, ' ');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Post - Microblog</title>
  <meta name="description" content="${escapeHtml(description)}">

  <!-- OGP -->
  <meta property="og:title" content="Microblog">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${postUrl}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Microblog">
  <meta name="twitter:description" content="${escapeHtml(description)}">

  <!-- Canonical -->
  <link rel="canonical" href="${postUrl}">

  <!-- ActivityPub -->
  <link rel="alternate" type="application/activity+json" href="https://${API_DOMAIN}/api/activitypub/posts/${post.id}">

  <style>
    :root {
      --background: #ffffff;
      --foreground: #171717;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --background: #0a0a0a;
        --foreground: #ededed;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.6;
      color: var(--foreground);
      background: var(--background);
      padding: 1rem;
    }
    .container {
      max-width: 42rem;
      margin: 0 auto;
    }
    header {
      margin-bottom: 2rem;
    }
    header h1 {
      font-size: 1.5rem;
      font-weight: normal;
    }
    header a {
      color: inherit;
      text-decoration: none;
    }
    header a:hover {
      opacity: 0.7;
    }
    article {
      background: color-mix(in srgb, var(--foreground) 5%, transparent);
      border: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
      border-radius: 0.5rem;
      padding: 1rem;
    }
    .content {
      white-space: pre-wrap;
      word-break: break-word;
      margin-bottom: 0.5rem;
    }
    .image {
      max-width: 100%;
      max-height: 24rem;
      border-radius: 0.5rem;
      border: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
      margin-bottom: 0.5rem;
    }
    time {
      font-size: 0.875rem;
      color: color-mix(in srgb, var(--foreground) 40%, transparent);
    }
    .back {
      display: block;
      text-align: center;
      margin-top: 1rem;
      color: color-mix(in srgb, var(--foreground) 60%, transparent);
    }
    .back:hover {
      color: var(--foreground);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1><a href="/">Microblog</a></h1>
    </header>

    <article>
      <p class="content">${contentHtml}</p>
      ${post.image_url ? `<img src="${escapeHtml(post.image_url)}" alt="" class="image">` : ''}
      <time datetime="${toISO8601(post.created_at)}">${formatDate(post.created_at)}</time>
    </article>

    <a href="/" class="back">View all posts</a>
  </div>
</body>
</html>`;
}

/**
 * Generate ActivityPub Note JSON
 */
function renderActivityPubNote(post: Post): object {
  const actorUrl = `https://${API_DOMAIN}/api/activitypub/actor`;
  const followersUrl = `https://${API_DOMAIN}/api/activitypub/followers`;
  const publicTarget = 'https://www.w3.org/ns/activitystreams#Public';
  const postUrl = `https://${API_DOMAIN}/api/activitypub/posts/${post.id}`;
  const content = post.content.replace(/\n/g, '<br>');
  const published = toISO8601(post.created_at);

  return {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: postUrl,
    type: 'Note',
    attributedTo: actorUrl,
    content: content,
    published: published,
    to: [publicTarget],
    cc: [followersUrl],
    url: `https://${DOMAIN}/posts/${post.id}`,
  };
}

/**
 * Check if request accepts ActivityPub JSON
 */
function wantsActivityPub(request: Request): boolean {
  const accept = request.headers.get('Accept') || '';
  return accept.includes('application/activity+json') ||
         accept.includes('application/ld+json');
}

/**
 * Handle /posts/:id request
 */
export async function handlePostPage(postId: number, request: Request, env: Env): Promise<Response> {
  const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?')
    .bind(postId)
    .first<Post>();

  if (!post) {
    return new Response('Post not found', {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Content negotiation
  if (wantsActivityPub(request)) {
    return new Response(JSON.stringify(renderActivityPubNote(post)), {
      headers: {
        'Content-Type': 'application/activity+json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'max-age=300',
      },
    });
  }

  // HTML response
  return new Response(renderPostHtml(post), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'max-age=60',
    },
  });
}

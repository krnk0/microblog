/**
 * Post page handler - serves HTML or ActivityPub JSON based on Accept header
 * Uses Preact JSX for safe HTML rendering (auto-escaping)
 */

import { render } from 'preact-render-to-string';
import type { VNode } from 'preact';
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
 * Format date for display
 */
function formatDate(datetime: string): string {
  const date = new Date(toISO8601(datetime));
  return date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

// ============================================
// Content Formatting (JSX-based, auto-escaped)
// ============================================

interface ContentSegment {
  type: 'text' | 'code-block' | 'inline-code' | 'link' | 'newline';
  content: string;
  language?: string;
}

/**
 * Parse content into segments
 */
function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];

  // First, split by code blocks
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Process text before code block
    if (match.index > lastIndex) {
      segments.push(...parseTextSegment(content.slice(lastIndex, match.index)));
    }
    // Add code block
    segments.push({
      type: 'code-block',
      content: match[2],
      language: match[1] || 'plaintext',
    });
    lastIndex = match.index + match[0].length;
  }

  // Process remaining text
  if (lastIndex < content.length) {
    segments.push(...parseTextSegment(content.slice(lastIndex)));
  }

  return segments;
}

/**
 * Parse text segment into inline code, links, and plain text
 */
function parseTextSegment(text: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const tokenRegex = /(`[^`\n]+`|https?:\/\/[^\s<>"']+|\n)/g;
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    const token = match[0];
    if (token === '\n') {
      segments.push({ type: 'newline', content: '\n' });
    } else if (token.startsWith('`')) {
      segments.push({
        type: 'inline-code',
        content: token.slice(1, -1),
      });
    } else {
      // URL - clean trailing punctuation
      const cleanUrl = token.replace(/[.,;:!?）)」』】>]+$/, '');
      segments.push({
        type: 'link',
        content: cleanUrl,
      });
      // Add trailing punctuation as text
      const trailing = token.slice(cleanUrl.length);
      if (trailing) {
        segments.push({ type: 'text', content: trailing });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Render content segments as JSX (auto-escaped)
 */
function FormatContent({ content }: { content: string }): VNode {
  const segments = parseContent(content);

  return (
    <>
      {segments.map((segment, index) => {
        switch (segment.type) {
          case 'code-block':
            return (
              <pre key={index} class="code-block">
                <code class={`language-${segment.language}`}>
                  {segment.content}
                </code>
              </pre>
            );
          case 'inline-code':
            return (
              <code key={index} class="inline-code">
                {segment.content}
              </code>
            );
          case 'link':
            return (
              <a
                key={index}
                href={segment.content}
                target="_blank"
                rel="noopener noreferrer"
                class="link"
              >
                {segment.content}
              </a>
            );
          case 'newline':
            return <br key={index} />;
          case 'text':
          default:
            return <span key={index}>{segment.content}</span>;
        }
      })}
    </>
  );
}

// ============================================
// Post Page Component
// ============================================

interface PostPageProps {
  post: Post;
  postUrl: string;
  description: string;
}

function PostPage({ post, postUrl, description }: PostPageProps): VNode {
  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Post - Microblog</title>
        <meta name="description" content={description} />

        {/* OGP */}
        <meta property="og:title" content="Microblog" />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={postUrl} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Microblog" />
        <meta name="twitter:description" content={description} />

        {/* Canonical */}
        <link rel="canonical" href={postUrl} />

        {/* ActivityPub */}
        <link
          rel="alternate"
          type="application/activity+json"
          href={`https://${API_DOMAIN}/api/activitypub/posts/${post.id}`}
        />

        {/* Syntax highlighting */}
        <link rel="stylesheet" href="/assets/prism-tomorrow.css" />
        <script src="/assets/prism.js"></script>
        <script src="/assets/prism-c.min.js"></script>
        <script src="/assets/prism-cpp.min.js"></script>
        <script src="/assets/prism-javascript.min.js"></script>
        <script src="/assets/prism-typescript.min.js"></script>
        <script src="/assets/prism-python.min.js"></script>
        <script src="/assets/prism-bash.min.js"></script>
        <script src="/assets/prism-rust.min.js"></script>
        <script src="/assets/prism-go.min.js"></script>
        <script src="/assets/prism-json.min.js"></script>
        <script src="/assets/prism-sql.min.js"></script>
        <script src="/assets/prism-java.min.js"></script>

        <style
          dangerouslySetInnerHTML={{
            __html: `
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
            /* Code blocks */
            .code-block {
              margin: 0.5rem 0;
              padding: 0.75rem;
              background: color-mix(in srgb, var(--foreground) 10%, transparent);
              border-radius: 0.5rem;
              overflow-x: auto;
            }
            .code-block code {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 0.875rem;
              white-space: pre;
            }
            /* Inline code */
            .inline-code {
              padding: 0.125rem 0.375rem;
              background: color-mix(in srgb, var(--foreground) 10%, transparent);
              border-radius: 0.25rem;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 0.875rem;
            }
            /* Links */
            .link {
              color: #60a5fa;
              text-decoration: none;
              word-break: break-all;
            }
            .link:hover {
              color: #93c5fd;
              text-decoration: underline;
            }
          `,
          }}
        />
      </head>
      <body>
        <div class="container">
          <header>
            <h1>
              <a href="/">Microblog</a>
            </h1>
          </header>

          <article>
            <div class="content">
              <FormatContent content={post.content} />
            </div>
            {post.image_url && (
              <img src={post.image_url} alt="" class="image" />
            )}
            <time dateTime={toISO8601(post.created_at)}>
              {formatDate(post.created_at)}
            </time>
          </article>

          <a href="/" class="back">
            View all posts
          </a>
        </div>
      </body>
    </html>
  );
}

/**
 * Render post page to HTML string
 */
function renderPostHtml(post: Post): string {
  const postUrl = `https://${DOMAIN}/posts/${post.id}`;
  const description = post.content.slice(0, 200).replace(/\n/g, ' ');

  const html = render(
    <PostPage post={post} postUrl={postUrl} description={description} />
  );

  return `<!DOCTYPE html>${html}`;
}

// ============================================
// ActivityPub
// ============================================

/**
 * Format content for ActivityPub (simple HTML)
 * Uses Preact JSX for safe HTML generation
 */
function formatContentForActivityPub(content: string): string {
  const segments = parseContent(content);

  // Render using Preact JSX for automatic escaping
  const vnode = (
    <>
      {segments.map((segment, index) => {
        switch (segment.type) {
          case 'code-block':
            return (
              <pre key={index}>
                <code>{segment.content}</code>
              </pre>
            );
          case 'inline-code':
            return <code key={index}>{segment.content}</code>;
          case 'link':
            return (
              <a
                key={index}
                href={segment.content}
                target="_blank"
                rel="noopener noreferrer"
              >
                {segment.content}
              </a>
            );
          case 'newline':
            return <br key={index} />;
          case 'text':
          default:
            return <span key={index}>{segment.content}</span>;
        }
      })}
    </>
  );

  return render(vnode);
}

/**
 * Generate ActivityPub Note JSON
 */
function renderActivityPubNote(post: Post): object {
  const actorUrl = `https://${API_DOMAIN}/api/activitypub/actor`;
  const followersUrl = `https://${API_DOMAIN}/api/activitypub/followers`;
  const publicTarget = 'https://www.w3.org/ns/activitystreams#Public';
  const postUrl = `https://${API_DOMAIN}/api/activitypub/posts/${post.id}`;
  const content = formatContentForActivityPub(post.content);
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

// ============================================
// Request Handler
// ============================================

/**
 * Check if request accepts ActivityPub JSON
 */
function wantsActivityPub(request: Request): boolean {
  const accept = request.headers.get('Accept') || '';
  return (
    accept.includes('application/activity+json') ||
    accept.includes('application/ld+json')
  );
}

/**
 * Handle /posts/:id request
 */
export async function handlePostPage(
  postId: number,
  request: Request,
  env: Env
): Promise<Response> {
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

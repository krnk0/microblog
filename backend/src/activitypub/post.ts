/**
 * ActivityPub individual post (Note) handler
 */

import type { Env, Post } from '../types';

const DOMAIN = 'mb.krnk.app';
const API_DOMAIN = 'mb-api.krnk.app';

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

export async function handlePost(postId: number, env: Env): Promise<Response> {
  const actorUrl = `https://${API_DOMAIN}/api/activitypub/actor`;
  const followersUrl = `https://${API_DOMAIN}/api/activitypub/followers`;
  const publicTarget = 'https://www.w3.org/ns/activitystreams#Public';

  const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?')
    .bind(postId)
    .first<Post>();

  if (!post) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const postUrl = `https://${API_DOMAIN}/api/activitypub/posts/${post.id}`;
  const content = post.content.replace(/\n/g, '<br>');
  const published = toISO8601(post.created_at);

  const note = {
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

  return new Response(JSON.stringify(note), {
    headers: {
      'Content-Type': 'application/activity+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'max-age=300',
    },
  });
}

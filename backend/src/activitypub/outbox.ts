/**
 * ActivityPub Outbox handler
 * Returns posts as an OrderedCollection with pagination
 */

import type { Env, Post } from '../types';

const DOMAIN = 'mb.krnk.app';
const API_DOMAIN = 'mb-api.krnk.app';

/**
 * Convert database datetime to ISO 8601 format
 * "2025-12-02 16:42:15" → "2025-12-02T16:42:15Z"
 */
function toISO8601(datetime: string): string {
  // Replace space with T
  let iso = datetime.replace(' ', 'T');
  // Ensure Z suffix for UTC
  if (!iso.endsWith('Z')) {
    iso += 'Z';
  }
  return iso;
}

export async function handleOutbox(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const isPageRequest = url.searchParams.get('page') === 'true';

  const outboxUrl = `https://${API_DOMAIN}/api/activitypub/outbox`;
  const actorUrl = `https://${API_DOMAIN}/api/activitypub/actor`;
  const followersUrl = `https://${API_DOMAIN}/api/activitypub/followers`;
  const publicTarget = 'https://www.w3.org/ns/activitystreams#Public';

  // Fetch all posts
  const { results } = await env.DB.prepare(
    'SELECT * FROM posts ORDER BY created_at DESC'
  ).all<Post>();

  // If not a page request, return collection metadata with first page reference
  if (!isPageRequest) {
    const collection = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: outboxUrl,
      type: 'OrderedCollection',
      totalItems: results.length,
      first: `${outboxUrl}?page=true`,
    };

    return new Response(JSON.stringify(collection), {
      headers: {
        'Content-Type': 'application/activity+json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'max-age=60',
      },
    });
  }

  // Page request: return OrderedCollectionPage with items
  const orderedItems = results.map((post) => {
    const postUrl = `https://${API_DOMAIN}/api/activitypub/posts/${post.id}`;
    const content = post.content.replace(/\n/g, '<br>');
    const published = toISO8601(post.created_at);

    return {
      id: `${postUrl}#create`,
      type: 'Create',
      actor: actorUrl,
      published: published,
      to: [publicTarget],
      cc: [followersUrl],
      object: {
        id: postUrl,
        type: 'Note',
        attributedTo: actorUrl,
        content: content,
        published: published,
        to: [publicTarget],
        cc: [followersUrl],
        url: `https://${DOMAIN}/posts/${post.id}`,
      },
    };
  });

  const page = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${outboxUrl}?page=true`,
    type: 'OrderedCollectionPage',
    partOf: outboxUrl,
    orderedItems: orderedItems,
  };

  return new Response(JSON.stringify(page), {
    headers: {
      'Content-Type': 'application/activity+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'max-age=60',
    },
  });
}

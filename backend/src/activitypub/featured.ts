/**
 * ActivityPub Featured collection handler
 * Returns pinned/featured posts as an OrderedCollection
 * Mastodon fetches this to display pinned posts on profile
 */

import type { Env, Post } from '../types';

const DOMAIN = 'mb.krnk.app';
const API_DOMAIN = 'mb.krnk.app';

// Number of posts to include in featured collection
const FEATURED_COUNT = 5;

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

export async function handleFeatured(env: Env): Promise<Response> {
  const featuredUrl = `https://${API_DOMAIN}/api/activitypub/featured`;
  const actorUrl = `https://${API_DOMAIN}/api/activitypub/actor`;
  const followersUrl = `https://${API_DOMAIN}/api/activitypub/followers`;
  const publicTarget = 'https://www.w3.org/ns/activitystreams#Public';

  // Fetch latest N posts
  const { results } = await env.DB.prepare(
    'SELECT * FROM posts ORDER BY created_at DESC LIMIT ?'
  ).bind(FEATURED_COUNT).all<Post>();

  // Convert to Note objects (not Create activities)
  const orderedItems = results.map((post) => {
    const postUrl = `https://${API_DOMAIN}/api/activitypub/posts/${post.id}`;
    const content = post.content.replace(/\n/g, '<br>');
    const published = toISO8601(post.created_at);

    return {
      id: postUrl,
      type: 'Note',
      attributedTo: actorUrl,
      content: content,
      published: published,
      to: [publicTarget],
      cc: [followersUrl],
      url: `https://${DOMAIN}/posts/${post.id}`,
    };
  });

  const collection = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: featuredUrl,
    type: 'OrderedCollection',
    totalItems: orderedItems.length,
    orderedItems: orderedItems,
  };

  return new Response(JSON.stringify(collection), {
    headers: {
      'Content-Type': 'application/activity+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'max-age=300',
    },
  });
}

/**
 * ActivityPub Outbox handler
 * Returns posts as an OrderedCollection of Create activities
 */

import type { Env, Post } from '../types';

const DOMAIN = 'mb.krnk.app';
const API_DOMAIN = 'mb-api.krnk.app';

export async function handleOutbox(env: Env): Promise<Response> {
  // Fetch all posts
  const { results } = await env.DB.prepare(
    'SELECT * FROM posts ORDER BY created_at DESC'
  ).all<Post>();

  const actorUrl = `https://${API_DOMAIN}/api/activitypub/actor`;
  const followersUrl = `https://${API_DOMAIN}/api/activitypub/followers`;
  const publicTarget = 'https://www.w3.org/ns/activitystreams#Public';

  // Convert posts to ActivityPub activities
  const orderedItems = results.map((post) => {
    const postUrl = `https://${API_DOMAIN}/api/activitypub/posts/${post.id}`;
    const content = post.content.replace(/\n/g, '<br>');

    return {
      id: postUrl,
      type: 'Create',
      actor: actorUrl,
      published: post.created_at,
      to: [publicTarget],
      cc: [followersUrl],
      object: {
        id: postUrl,
        type: 'Note',
        attributedTo: actorUrl,
        content: content,
        published: post.created_at,
        to: [publicTarget],
        cc: [followersUrl],
        url: `https://${DOMAIN}/#post-${post.id}`,
      },
    };
  });

  const outbox = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `https://${API_DOMAIN}/api/activitypub/outbox`,
    type: 'OrderedCollection',
    totalItems: orderedItems.length,
    orderedItems: orderedItems,
  };

  return new Response(JSON.stringify(outbox), {
    headers: {
      'Content-Type': 'application/activity+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'max-age=60',
    },
  });
}

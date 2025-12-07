/**
 * ActivityPub Collections (following, followers)
 * Returns empty collections for now
 */

const API_DOMAIN = 'mb-api.krnk.app';

export function handleFollowing(): Response {
  const collection = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `https://${API_DOMAIN}/api/activitypub/following`,
    type: 'OrderedCollection',
    totalItems: 0,
    orderedItems: [],
  };

  return new Response(JSON.stringify(collection), {
    headers: {
      'Content-Type': 'application/activity+json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export function handleFollowers(): Response {
  const collection = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `https://${API_DOMAIN}/api/activitypub/followers`,
    type: 'OrderedCollection',
    totalItems: 0,
    orderedItems: [],
  };

  return new Response(JSON.stringify(collection), {
    headers: {
      'Content-Type': 'application/activity+json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

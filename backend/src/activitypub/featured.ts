/**
 * ActivityPub Featured collection handler
 * Returns pinned/featured posts as an OrderedCollection
 * Currently returns empty collection (no pinned posts)
 * TODO: Add admin UI to pin specific posts
 */

const API_DOMAIN = 'mb.krnk.app';

export async function handleFeatured(): Promise<Response> {
  const featuredUrl = `https://${API_DOMAIN}/api/activitypub/featured`;

  // Return empty collection (no pinned posts for now)
  const collection = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: featuredUrl,
    type: 'OrderedCollection',
    totalItems: 0,
    orderedItems: [],
  };

  return new Response(JSON.stringify(collection), {
    headers: {
      'Content-Type': 'application/activity+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'max-age=300',
    },
  });
}

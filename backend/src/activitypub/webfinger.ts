/**
 * WebFinger handler (RFC 7033)
 * Allows other ActivityPub servers to discover this account
 */

const DOMAIN = 'mb.krnk.app';
const API_DOMAIN = 'mb-api.krnk.app';
const USERNAME = 'default';

export async function handleWebFinger(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const resource = url.searchParams.get('resource');

  // Validate resource parameter
  if (!resource) {
    return new Response(JSON.stringify({ error: 'Missing resource parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse acct: URI
  if (!resource.startsWith('acct:')) {
    return new Response(JSON.stringify({ error: 'Invalid resource format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const acct = resource.slice(5); // Remove 'acct:'
  const [user, domain] = acct.split('@');

  // Validate user and domain
  if (domain !== DOMAIN || user !== USERNAME) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Return WebFinger response
  const response = {
    subject: resource,
    aliases: [`https://${API_DOMAIN}/api/activitypub/actor`],
    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: `https://${API_DOMAIN}/api/activitypub/actor`,
      },
      {
        rel: 'http://webfinger.net/rel/profile-page',
        type: 'text/html',
        href: `https://${DOMAIN}`,
      },
    ],
  };

  return new Response(JSON.stringify(response), {
    headers: {
      'Content-Type': 'application/jrd+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'max-age=3600',
    },
  });
}

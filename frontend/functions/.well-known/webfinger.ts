/**
 * Cloudflare Pages Function to proxy WebFinger requests to backend
 * This allows mb.krnk.app/.well-known/webfinger to work
 */

export const onRequest: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);

  // Proxy to backend
  const backendUrl = `https://mb-api.krnk.app${url.pathname}${url.search}`;

  const response = await fetch(backendUrl, {
    method: request.method,
    headers: {
      Accept: request.headers.get('Accept') || 'application/jrd+json',
    },
  });

  // Return with CORS headers
  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/jrd+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'max-age=3600',
    },
  });
};

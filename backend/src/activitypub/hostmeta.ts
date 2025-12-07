/**
 * Host-meta handler (RFC 6415)
 * Legacy discovery mechanism used by some ActivityPub implementations
 */

const DOMAIN = 'mb.krnk.app';

export function handleHostMeta(): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0">
  <Link rel="lrdd" template="https://${DOMAIN}/.well-known/webfinger?resource={uri}"/>
</XRD>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xrd+xml; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'max-age=86400',
    },
  });
}

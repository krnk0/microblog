/**
 * ActivityPub Actor handler
 * Returns the Actor object with public key for signature verification
 */

import type { Env } from '../types';
import { getPublicKeyPem } from './keys';

const DOMAIN = 'mb.krnk.app';
const API_DOMAIN = 'mb-api.krnk.app';
const USERNAME = 'default';

export async function handleActor(env: Env): Promise<Response> {
  // Get public key from D1
  const publicKeyPem = await getPublicKeyPem(env.DB, USERNAME);

  if (!publicKeyPem) {
    return new Response(JSON.stringify({ error: 'Actor not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const actorUrl = `https://${API_DOMAIN}/api/activitypub/actor`;

  const actor = {
    '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1'],
    id: actorUrl,
    type: 'Person',
    preferredUsername: USERNAME,
    name: 'Microblog User',
    summary: 'Personal microblog powered by Cloudflare Workers',
    url: `https://${DOMAIN}`,
    inbox: `https://${API_DOMAIN}/api/activitypub/inbox`,
    outbox: `https://${API_DOMAIN}/api/activitypub/outbox`,
    followers: `https://${API_DOMAIN}/api/activitypub/followers`,
    following: `https://${API_DOMAIN}/api/activitypub/following`,
    publicKey: {
      id: `${actorUrl}#main-key`,
      owner: actorUrl,
      publicKeyPem: publicKeyPem,
    },
  };

  return new Response(JSON.stringify(actor), {
    headers: {
      'Content-Type': 'application/activity+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'max-age=3600',
    },
  });
}

/**
 * ActivityPub Delivery
 * Secure delivery of activities to follower inboxes
 */

import type { Env, Post } from '../types';
import { getPrivateKey, signRequest } from './keys';

const DOMAIN = 'mb.krnk.app';
const DELIVERY_TIMEOUT_MS = 10000;

interface Follower {
  id: number;
  actor_id: string;
  inbox_url: string;
  shared_inbox_url: string | null;
  created_at: string;
}

/**
 * Validate inbox URL for security
 * - HTTPS only
 * - No userinfo (username:password)
 * - Port 443 only
 * - No localhost, .local, .internal
 * - No IP literals
 */
export function validateInboxUrl(raw: string): URL {
  const url = new URL(raw);

  // HTTPS only
  if (url.protocol !== 'https:') {
    throw new Error('inbox must be https');
  }

  // No userinfo
  if (url.username || url.password) {
    throw new Error('userinfo not allowed');
  }

  // Port restriction (empty = 443)
  const port = url.port || '443';
  if (port !== '443') {
    throw new Error('port not allowed');
  }

  // Block local hostnames
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('local hostname not allowed');
  }

  // Block IP literals (IPv4 and IPv6)
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.startsWith('[')) {
    throw new Error('ip literal not allowed');
  }

  return url;
}

/**
 * Deliver an activity to an inbox with security measures
 */
async function deliverToInbox(
  inbox: string,
  body: string,
  headers: Headers
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const url = validateInboxUrl(inbox);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers,
        body,
        redirect: 'manual', // Don't follow redirects
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Reject redirects
      if (response.status >= 300 && response.status < 400) {
        return { success: false, status: response.status, error: 'redirect not allowed' };
      }

      // Accept 2xx as success, 202 is common for async processing
      if (response.ok) {
        return { success: true, status: response.status };
      }

      return { success: false, status: response.status, error: await response.text() };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'timeout' };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: 'unknown error' };
  }
}

/**
 * Build a Create(Note) activity for a post
 */
function buildCreateActivity(post: Post): object {
  const actorUrl = `https://${DOMAIN}/api/activitypub/actor`;
  const postUrl = `https://${DOMAIN}/api/activitypub/posts/${post.id}`;
  const followersUrl = `https://${DOMAIN}/api/activitypub/followers`;
  const publicTarget = 'https://www.w3.org/ns/activitystreams#Public';

  // Ensure ISO 8601 format with Z suffix
  let published = post.created_at;
  if (!published.includes('T')) {
    published = published.replace(' ', 'T');
  }
  if (!published.endsWith('Z')) {
    published += 'Z';
  }

  // Convert newlines to <br> for HTML content
  const htmlContent = post.content.replace(/\n/g, '<br>');

  const note: Record<string, unknown> = {
    id: postUrl,
    type: 'Note',
    attributedTo: actorUrl,
    content: htmlContent,
    published: published,
    to: [publicTarget],
    cc: [followersUrl],
    url: `https://${DOMAIN}/posts/${post.id}`,
  };

  // Add image attachment if present
  if (post.image_url) {
    note.attachment = [
      {
        type: 'Image',
        mediaType: 'image/jpeg', // Could be improved to detect actual type
        url: post.image_url,
      },
    ];
  }

  return {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${postUrl}#create`,
    type: 'Create',
    actor: actorUrl,
    published: published,
    to: [publicTarget],
    cc: [followersUrl],
    object: note,
  };
}

/**
 * Deliver a post to all followers
 * Uses shared inbox when available to reduce requests
 */
export async function deliverToFollowers(
  post: Post,
  env: Env
): Promise<{ delivered: number; failed: number; errors: string[] }> {
  // Get all followers
  const { results: followers } = await env.DB.prepare(
    'SELECT * FROM followers'
  ).all<Follower>();

  if (!followers || followers.length === 0) {
    console.log('No followers to deliver to');
    return { delivered: 0, failed: 0, errors: [] };
  }

  // Get private key for signing
  const privateKey = await getPrivateKey(env.DB, 'default');
  if (!privateKey) {
    console.error('No private key found for signing');
    return { delivered: 0, failed: followers.length, errors: ['No private key'] };
  }

  const actorUrl = `https://${DOMAIN}/api/activitypub/actor`;
  const keyId = `${actorUrl}#main-key`;

  // Build the activity
  const activity = buildCreateActivity(post);
  const activityBody = JSON.stringify(activity);

  // Deduplicate by shared inbox (send once per instance)
  const inboxes = new Map<string, string[]>(); // inbox -> [actor_ids]
  for (const follower of followers) {
    const inbox = follower.shared_inbox_url || follower.inbox_url;
    const actors = inboxes.get(inbox) || [];
    actors.push(follower.actor_id);
    inboxes.set(inbox, actors);
  }

  console.log(`Delivering to ${inboxes.size} inboxes (${followers.length} followers)`);

  // Deliver to each unique inbox
  let delivered = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const [inbox, actorIds] of inboxes) {
    try {
      // Sign the request for this inbox
      const signedHeaders = await signRequest(inbox, activityBody, privateKey, keyId);

      const result = await deliverToInbox(inbox, activityBody, signedHeaders);

      if (result.success) {
        console.log(`Delivered to ${inbox} (${actorIds.length} followers)`);
        delivered += actorIds.length;
      } else {
        console.error(`Failed to deliver to ${inbox}: ${result.error}`);
        failed += actorIds.length;
        errors.push(`${inbox}: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error delivering to ${inbox}:`, error);
      failed += actorIds.length;
      errors.push(`${inbox}: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  return { delivered, failed, errors };
}

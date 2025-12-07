/**
 * ActivityPub Inbox handler
 * Receives Follow activities and sends Accept responses
 */

import type { Env } from '../types';
import { getPrivateKey, signRequest } from './keys';

const API_DOMAIN = 'mb-api.krnk.app';
const USER_ID = 'default';

interface Activity {
  '@context'?: string | string[];
  id: string;
  type: string;
  actor: string;
  object: string | object;
}

interface Actor {
  id: string;
  inbox: string;
  type: string;
}

export async function handleInbox(request: Request, env: Env): Promise<Response> {
  let activity: Activity;
  try {
    activity = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  console.log('Inbox received:', activity.type, 'from', activity.actor);

  // Only handle Follow for now
  if (activity.type !== 'Follow') {
    console.log('Ignoring activity type:', activity.type);
    return new Response('', { status: 202 });
  }

  // Get the follower's Actor to find their inbox
  let followerActor: Actor;
  try {
    const actorResponse = await fetch(activity.actor, {
      headers: { Accept: 'application/activity+json' },
    });
    if (!actorResponse.ok) {
      console.error('Failed to fetch follower actor:', actorResponse.status);
      return new Response('', { status: 202 });
    }
    followerActor = await actorResponse.json();
  } catch (error) {
    console.error('Error fetching follower actor:', error);
    return new Response('', { status: 202 });
  }

  console.log('Follower inbox:', followerActor.inbox);

  // Get our private key
  const privateKey = await getPrivateKey(env.DB, USER_ID);
  if (!privateKey) {
    console.error('No private key found');
    return new Response('', { status: 500 });
  }

  const actorUrl = `https://${API_DOMAIN}/api/activitypub/actor`;
  const keyId = `${actorUrl}#main-key`;

  // Create Accept activity
  const acceptActivity = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${actorUrl}#accept-${Date.now()}`,
    type: 'Accept',
    actor: actorUrl,
    object: activity,
  };

  const acceptBody = JSON.stringify(acceptActivity);

  // Sign the request
  const signedHeaders = await signRequest(
    followerActor.inbox,
    acceptBody,
    privateKey,
    keyId
  );

  // Send Accept to follower's inbox
  try {
    const response = await fetch(followerActor.inbox, {
      method: 'POST',
      headers: signedHeaders,
      body: acceptBody,
    });

    console.log('Accept response:', response.status, await response.text());

    if (!response.ok) {
      console.error('Failed to send Accept:', response.status);
    }
  } catch (error) {
    console.error('Error sending Accept:', error);
  }

  return new Response('', { status: 202 });
}

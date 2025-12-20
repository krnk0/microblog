/**
 * ActivityPub Inbox handler
 * Receives Follow/Undo activities and processes them
 */

import type { Env } from '../types';
import { getPrivateKey, signRequest } from './keys';

const API_DOMAIN = 'mb.krnk.app';
const USER_ID = 'default';

// Known ActivityPub activity types
type ActivityTypeName =
  | 'Follow'
  | 'Undo'
  | 'Accept'
  | 'Reject'
  | 'Create'
  | 'Update'
  | 'Delete'
  | 'Like'
  | 'Announce'
  | 'Add'
  | 'Remove';

interface Activity {
  '@context'?: string | string[];
  id: string;
  type: ActivityTypeName;
  actor: string;
  object: string | Activity;
}

interface Actor {
  id: string;
  inbox: string;
  type: string;
  endpoints?: {
    sharedInbox?: string;
  };
}

export async function handleInbox(request: Request, env: Env): Promise<Response> {
  let activity: Activity;
  try {
    activity = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  console.log('Inbox received:', activity.type, 'from', activity.actor);

  // Route by activity type
  switch (activity.type) {
    case 'Follow':
      return handleFollow(activity, env);
    case 'Undo':
      return handleUndo(activity, env);
    default:
      console.log('Ignoring activity type:', activity.type);
      return new Response('', { status: 202 });
  }
}

/**
 * Handle Follow activity - send Accept and save follower
 */
async function handleFollow(activity: Activity, env: Env): Promise<Response> {

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
    } else {
      // Save follower to database after successful Accept
      await saveFollower(env.DB, followerActor);
    }
  } catch (error) {
    console.error('Error sending Accept:', error);
  }

  return new Response('', { status: 202 });
}

/**
 * Save follower to database
 */
async function saveFollower(db: D1Database, actor: Actor): Promise<void> {
  const now = new Date().toISOString();
  const sharedInbox = actor.endpoints?.sharedInbox || null;

  try {
    await db
      .prepare(
        `INSERT OR REPLACE INTO followers (actor_id, inbox_url, shared_inbox_url, created_at)
         VALUES (?, ?, ?, COALESCE((SELECT created_at FROM followers WHERE actor_id = ?), ?))`
      )
      .bind(actor.id, actor.inbox, sharedInbox, actor.id, now)
      .run();

    console.log('Saved follower:', actor.id);
  } catch (error) {
    console.error('Failed to save follower:', error);
  }
}

/**
 * Handle Undo activity - currently only supports Undo(Follow)
 */
async function handleUndo(activity: Activity, env: Env): Promise<Response> {
  // Undo wraps another activity in its object
  if (typeof activity.object === 'string') {
    console.log('Undo object is a string reference, ignoring');
    return new Response('', { status: 202 });
  }

  const innerActivity = activity.object;

  // Only handle Undo(Follow)
  if (innerActivity.type !== 'Follow') {
    console.log('Ignoring Undo for:', innerActivity.type);
    return new Response('', { status: 202 });
  }

  // Security: verify the Undo actor matches the original Follow actor
  if (activity.actor !== innerActivity.actor) {
    console.error('Actor mismatch: Undo actor', activity.actor, '!= Follow actor', innerActivity.actor);
    return new Response('Actor mismatch', { status: 403 });
  }

  // Remove follower from database
  await removeFollower(env.DB, activity.actor);

  return new Response('', { status: 202 });
}

/**
 * Remove follower from database
 */
async function removeFollower(db: D1Database, actorId: string): Promise<void> {
  try {
    const result = await db
      .prepare('DELETE FROM followers WHERE actor_id = ?')
      .bind(actorId)
      .run();

    if (result.meta.changes > 0) {
      console.log('Removed follower:', actorId);
    } else {
      console.log('Follower not found:', actorId);
    }
  } catch (error) {
    console.error('Failed to remove follower:', error);
  }
}

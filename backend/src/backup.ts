/**
 * Automated backup to R2
 * Exports posts as JSON and stores in R2 bucket
 */

import type { Env, Post } from './types';

/**
 * Run backup: export all posts to R2 as JSON
 */
export async function runBackup(env: Env): Promise<{ success: boolean; key: string; count: number }> {
  // Get all posts
  const { results: posts } = await env.DB.prepare(
    'SELECT * FROM posts ORDER BY id ASC'
  ).all<Post>();

  // Create backup data
  const backup = {
    version: 1,
    exported_at: new Date().toISOString(),
    posts: posts,
  };

  const json = JSON.stringify(backup, null, 2);

  // Generate key with timestamp: backups/2025-12-20T12:00:00Z.json
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const key = `backups/${timestamp}.json`;

  // Save to R2
  await env.MEDIA.put(key, json, {
    httpMetadata: {
      contentType: 'application/json',
    },
  });

  console.log(`Backup complete: ${key} (${posts.length} posts, ${json.length} bytes)`);

  return {
    success: true,
    key,
    count: posts.length,
  };
}

/**
 * List recent backups
 */
export async function listBackups(env: Env): Promise<string[]> {
  const list = await env.MEDIA.list({ prefix: 'backups/' });
  return list.objects.map((obj) => obj.key);
}

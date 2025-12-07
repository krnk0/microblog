import type { Env } from './types';
import { isAuthenticated, handleLogin, handleLogout } from './auth';
import { handleGetPosts, handleCreatePost, handleDeletePost } from './posts';
import { handleUploadMedia, handleGetMedia } from './media';
import { handleRssFeed } from './feed';
import { handleWebFinger, handleHostMeta, handleActor, handleOutbox } from './activitypub';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers (dynamic origin for credentials support)
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'https://mb.krnk.app'];
    const allowOrigin = allowedOrigins.includes(origin) ? origin : '';

    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };

    if (allowOrigin) {
      corsHeaders['Access-Control-Allow-Origin'] = allowOrigin;
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Routes
    try {
      // Auth routes
      if (url.pathname === '/api/auth/login' && request.method === 'POST') {
        return await handleLogin(request, env, corsHeaders);
      }

      if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
        return await handleLogout(corsHeaders);
      }

      // Posts routes
      if (url.pathname === '/api/posts' && request.method === 'GET') {
        return await handleGetPosts(env, corsHeaders);
      }

      if (url.pathname === '/api/posts' && request.method === 'POST') {
        if (!(await isAuthenticated(request, env))) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return await handleCreatePost(request, env, corsHeaders);
      }

      const deleteMatch = url.pathname.match(/^\/api\/posts\/(\d+)$/);
      if (deleteMatch && request.method === 'DELETE') {
        if (!(await isAuthenticated(request, env))) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const postId = parseInt(deleteMatch[1]);
        return await handleDeletePost(postId, env, corsHeaders);
      }

      // Media routes
      if (url.pathname === '/api/media' && request.method === 'POST') {
        if (!(await isAuthenticated(request, env))) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return await handleUploadMedia(request, env, corsHeaders);
      }

      const mediaMatch = url.pathname.match(/^\/api\/media\/([^/]+)$/);
      if (mediaMatch && request.method === 'GET') {
        const filename = mediaMatch[1];
        return await handleGetMedia(filename, env, corsHeaders);
      }

      // Feed routes
      if (url.pathname === '/feed.xml' && request.method === 'GET') {
        return await handleRssFeed(env);
      }

      // ActivityPub routes
      if (url.pathname === '/.well-known/webfinger' && request.method === 'GET') {
        return await handleWebFinger(request);
      }

      if (url.pathname === '/.well-known/host-meta' && request.method === 'GET') {
        return handleHostMeta();
      }

      if (url.pathname === '/api/activitypub/actor' && request.method === 'GET') {
        return await handleActor(env);
      }

      if (url.pathname === '/api/activitypub/outbox' && request.method === 'GET') {
        return await handleOutbox(env);
      }

      // 404
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

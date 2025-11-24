import { Env, CreatePostRequest, Post, LoginRequest } from './types';
import { generateToken, verifyToken, verifyPassword } from './auth';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Routes
    try {
      // POST /api/auth/login - ログイン（JWT発行）
      if (url.pathname === '/api/auth/login' && request.method === 'POST') {
        return await handleLogin(request, env, corsHeaders);
      }

      // GET /api/posts - 投稿一覧
      if (url.pathname === '/api/posts' && request.method === 'GET') {
        return await handleGetPosts(env, corsHeaders);
      }

      // POST /api/posts - 投稿作成（要認証）
      if (url.pathname === '/api/posts' && request.method === 'POST') {
        // 認証チェック
        if (!(await isAuthenticated(request, env))) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return await handleCreatePost(request, env, corsHeaders);
      }

      // DELETE /api/posts/:id - 投稿削除（要認証）
      const deleteMatch = url.pathname.match(/^\/api\/posts\/(\d+)$/);
      if (deleteMatch && request.method === 'DELETE') {
        // 認証チェック
        if (!(await isAuthenticated(request, env))) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const postId = parseInt(deleteMatch[1]);
        return await handleDeletePost(postId, env, corsHeaders);
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

// 認証チェック（JWT検証）
async function isAuthenticated(request: Request, env: Env): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
  return await verifyToken(token, env);
}

// GET /api/posts - 投稿一覧取得
async function handleGetPosts(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM posts ORDER BY created_at DESC LIMIT 50'
  ).all<Post>();

  return new Response(JSON.stringify({ posts: results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// POST /api/posts - 投稿作成
async function handleCreatePost(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const body = await request.json<CreatePostRequest>();

  if (!body.content || body.content.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Content is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 文字数制限（Twitterライクに280文字）
  if (body.content.length > 280) {
    return new Response(JSON.stringify({ error: 'Content too long (max 280 characters)' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const result = await env.DB.prepare(
    'INSERT INTO posts (content, created_at) VALUES (?, datetime("now")) RETURNING *'
  ).bind(body.content).first<Post>();

  return new Response(JSON.stringify({ post: result }), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// DELETE /api/posts/:id - 投稿削除
async function handleDeletePost(
  postId: number,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const result = await env.DB.prepare(
    'DELETE FROM posts WHERE id = ? RETURNING *'
  ).bind(postId).first<Post>();

  if (!result) {
    return new Response(JSON.stringify({ error: 'Post not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ message: 'Post deleted', post: result }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// POST /api/auth/login - ログイン（JWT発行）
async function handleLogin(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const body = await request.json<LoginRequest>();

  if (!body.password) {
    return new Response(JSON.stringify({ error: 'Password is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // パスワード検証
  if (!verifyPassword(body.password, env)) {
    return new Response(JSON.stringify({ error: 'Invalid password' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // JWT生成
  const token = await generateToken(env);

  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

import { Env, CreatePostRequest, Post, LoginRequest } from './types';
import { generateToken, verifyToken, verifyPassword } from './auth';

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
      // POST /api/auth/login - ログイン（JWT発行）
      if (url.pathname === '/api/auth/login' && request.method === 'POST') {
        return await handleLogin(request, env, corsHeaders);
      }

      // POST /api/auth/logout - ログアウト（Cookie削除）
      if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
        return await handleLogout(corsHeaders);
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

      // POST /api/media - 画像アップロード（要認証）
      if (url.pathname === '/api/media' && request.method === 'POST') {
        // 認証チェック
        if (!(await isAuthenticated(request, env))) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return await handleUploadMedia(request, env, corsHeaders);
      }

      // GET /api/media/:filename - 画像取得
      const mediaMatch = url.pathname.match(/^\/api\/media\/([^/]+)$/);
      if (mediaMatch && request.method === 'GET') {
        const filename = mediaMatch[1];
        return await handleGetMedia(filename, env, corsHeaders);
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

// 認証チェック（JWT検証 - HttpOnly Cookieから取得）
async function isAuthenticated(request: Request, env: Env): Promise<boolean> {
  // まずCookieから取得を試みる
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const authCookie = cookies.find(c => c.startsWith('auth_token='));
    if (authCookie) {
      const token = authCookie.slice('auth_token='.length);
      return await verifyToken(token, env);
    }
  }

  // フォールバック: Authorizationヘッダーからも取得（後方互換性）
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    return await verifyToken(token, env);
  }

  return false;
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

  // image_url がある場合とない場合で分岐
  const result = body.image_url
    ? await env.DB.prepare(
        'INSERT INTO posts (content, image_url, created_at) VALUES (?, ?, datetime("now") || "Z") RETURNING *'
      ).bind(body.content, body.image_url).first<Post>()
    : await env.DB.prepare(
        'INSERT INTO posts (content, created_at) VALUES (?, datetime("now") || "Z") RETURNING *'
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

// POST /api/media - 画像アップロード
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

type SupportedImageMime = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

// マジックバイトから実際の画像形式を検出
function detectImageType(buffer: ArrayBuffer): SupportedImageMime | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
    bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
  ) {
    return 'image/png';
  }

  // GIF: "GIF87a" or "GIF89a"
  if (
    bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && // GIF
    bytes[3] === 0x38 &&                                           // '8'
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&                    // '7' or '9'
    bytes[5] === 0x61                                              // 'a'
  ) {
    return 'image/gif';
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // "RIFF"
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50  // "WEBP"
  ) {
    return 'image/webp';
  }

  return null;
}

async function handleUploadMedia(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // サイズチェック（Content-Lengthヘッダー）
  const contentLength = request.headers.get('Content-Length');
  if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE) {
    return new Response(JSON.stringify({ error: 'File too large. Max 5MB' }), {
      status: 413,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ボディを取得
  const body = await request.arrayBuffer();

  // 実際のサイズもチェック（Content-Lengthが偽装されている場合）
  if (body.byteLength > MAX_IMAGE_SIZE) {
    return new Response(JSON.stringify({ error: 'File too large. Max 5MB' }), {
      status: 413,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // マジックバイトで実際のファイル形式を検証
  const detectedType = detectImageType(body);
  if (!detectedType) {
    return new Response(JSON.stringify({ error: 'Invalid file type. Allowed: jpeg, png, gif, webp' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ファイル名生成（タイムスタンプ + ランダム）
  const ext = detectedType.split('/')[1].replace('jpeg', 'jpg');
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

  // R2にアップロード（検出したContent-Typeを使用）
  await env.MEDIA.put(filename, body, {
    httpMetadata: { contentType: detectedType },
  });

  // Worker経由のURLを返す
  const requestUrl = new URL(request.url);
  const imageUrl = `${requestUrl.protocol}//${requestUrl.host}/api/media/${filename}`;

  return new Response(JSON.stringify({ url: imageUrl }), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// GET /api/media/:filename - 画像取得
async function handleGetMedia(
  filename: string,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // 許可する文字種のみ（制御文字・改行等を弾く）
  const allowedChars = /^[a-zA-Z0-9._-]+$/;
  if (!allowedChars.test(filename)) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const object = await env.MEDIA.get(filename);

    if (!object) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Content-Disposition', 'inline');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('R2 access error:', error);
    return new Response(JSON.stringify({ error: 'Storage error' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// POST /api/auth/logout - ログアウト（Cookie削除）
async function handleLogout(corsHeaders: Record<string, string>): Promise<Response> {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Set-Cookie': 'auth_token=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/',
    },
  });
}

// POST /api/auth/login - ログイン（HttpOnly Cookie発行）
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

  // HttpOnly Cookieとして発行（7日間有効、SameSite=Lax）
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Set-Cookie': `auth_token=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=604800; Path=/`,
    },
  });
}

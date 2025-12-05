import { SignJWT, jwtVerify } from 'jose';
import type { Env, LoginRequest } from './types';

// JWT生成
export async function generateToken(env: Env): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return token;
}

// JWT検証
export async function verifyToken(token: string, env: Env): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    await jwtVerify(token, secret);
    return true;
  } catch (error) {
    return false;
  }
}

// パスワード検証
export function verifyPassword(password: string, env: Env): boolean {
  return password === env.AUTH_PASSWORD;
}

// 認証チェック（JWT検証 - HttpOnly Cookieから取得）
export async function isAuthenticated(request: Request, env: Env): Promise<boolean> {
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

// POST /api/auth/login - ログイン（HttpOnly Cookie発行）
export async function handleLogin(
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

// POST /api/auth/logout - ログアウト（Cookie削除）
export async function handleLogout(corsHeaders: Record<string, string>): Promise<Response> {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Set-Cookie': 'auth_token=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/',
    },
  });
}

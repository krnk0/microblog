import { SignJWT, jwtVerify } from 'jose';
import type { Env } from './types';

// JWT生成
export async function generateToken(env: Env): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7日間有効
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

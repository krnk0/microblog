export interface Env {
  // D1 Database
  DB: D1Database;

  // R2 Storage
  MEDIA: R2Bucket;

  // Secrets
  AUTH_PASSWORD: string;
  JWT_SECRET: string;
}

export interface Post {
  id: number;
  content: string;
  image_url?: string;
  created_at: string;
}

export interface CreatePostRequest {
  content: string;
  image_url?: string;
}

export interface LoginRequest {
  password: string;
}

export interface LoginResponse {
  token: string;
}

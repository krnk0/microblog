import type { Env, Post, CreatePostRequest } from './types';

// GET /api/posts/:id - 単一投稿取得
export async function handleGetPost(
  postId: number,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?')
    .bind(postId)
    .first<Post>();

  if (!post) {
    return new Response(JSON.stringify({ error: 'Post not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ post }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// GET /api/posts - 投稿一覧取得
export async function handleGetPosts(
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM posts ORDER BY created_at DESC LIMIT 50'
  ).all<Post>();

  return new Response(JSON.stringify({ posts: results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// POST /api/posts - 投稿作成
export async function handleCreatePost(
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
export async function handleDeletePost(
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

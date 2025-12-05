import type { Env } from './types';

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
    bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return 'image/gif';
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

// POST /api/media - 画像アップロード
export async function handleUploadMedia(
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
export async function handleGetMedia(
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

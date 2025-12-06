import { describe, it, expect } from 'vitest';
import { detectImageType } from '../media';

describe('detectImageType', () => {
  // 実際の画像ファイル（Base64エンコード）
  // 1x1px transparent PNG (68 bytes)
  const REAL_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // 1x1px red GIF (35 bytes)
  const REAL_GIF = 'R0lGODlhAQABAIAAAP8AAP///yH5BAEAAAEALAAAAAABAAEAAAICTAEAOw==';

  // 最小JPEG (134 bytes, 1x1px black)
  const REAL_JPEG = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==';

  // 1x1px WebP (26 bytes)
  const REAL_WEBP = 'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';

  it('should detect real PNG file', () => {
    const buffer = Buffer.from(REAL_PNG, 'base64');
    expect(detectImageType(buffer)).toBe('image/png');
  });

  it('should detect real JPEG file', () => {
    const buffer = Buffer.from(REAL_JPEG, 'base64');
    expect(detectImageType(buffer)).toBe('image/jpeg');
  });

  it('should detect real GIF file', () => {
    const buffer = Buffer.from(REAL_GIF, 'base64');
    expect(detectImageType(buffer)).toBe('image/gif');
  });

  it('should detect real WebP file', () => {
    const buffer = Buffer.from(REAL_WEBP, 'base64');
    expect(detectImageType(buffer)).toBe('image/webp');
  });

  it('should return null for text file', () => {
    const txt = new TextEncoder().encode('Hello, World!');
    expect(detectImageType(txt.buffer)).toBeNull();
  });

  it('should return null for too short buffer', () => {
    const short = new Uint8Array([0xFF, 0xD8]);
    expect(detectImageType(short.buffer)).toBeNull();
  });

  it('should return null for empty buffer', () => {
    const empty = new Uint8Array([]);
    expect(detectImageType(empty.buffer)).toBeNull();
  });

  it('should reject file with wrong extension (PNG pretending to be JPEG)', () => {
    // 実際の中身はPNG
    const buffer = Buffer.from(REAL_PNG, 'base64');
    const result = detectImageType(buffer);
    // 拡張子ではなくマジックバイトで判定されることを確認
    expect(result).toBe('image/png');
    expect(result).not.toBe('image/jpeg');
  });
});

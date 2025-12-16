/**
 * Smoke tests - verify basic functionality works
 * Requires dev servers to be running:
 *   - Frontend: npm run dev (localhost:3001)
 *   - Backend: cd ../backend && npm run dev (localhost:8787)
 */

import { describe, it, expect } from 'vitest';

const FRONTEND_URL = 'http://localhost:3001';
const BACKEND_URL = 'http://localhost:8787';

describe('Frontend pages', () => {
  it('/ returns 200', async () => {
    const res = await fetch(`${FRONTEND_URL}/`);
    expect(res.status).toBe(200);
  });

  it('/admin returns 200', async () => {
    const res = await fetch(`${FRONTEND_URL}/admin`);
    expect(res.status).toBe(200);
  });
});

describe('Backend API', () => {
  it('/api/posts returns 200 with JSON', async () => {
    const res = await fetch(`${BACKEND_URL}/api/posts`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('posts');
    expect(Array.isArray(data.posts)).toBe(true);
  });
});

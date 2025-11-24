'use client';

import { useState, useEffect } from 'react';
import type { Post } from '../../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState('');

  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 投稿一覧を取得
  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/posts`);
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  };

  // 初回読み込み（認証状態復元 + 投稿取得）
  useEffect(() => {
    // LocalStorageから認証トークンを復元
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      setAuthToken(savedToken);
      setIsAuthenticated(true);
    }

    fetchPosts();
  }, []);

  // 認証（JWT取得）
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // パスワードを送信してJWTを取得
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await res.json();
      const token = data.token;

      setAuthToken(token);
      setIsAuthenticated(true);
      localStorage.setItem('authToken', token); // JWTをLocalStorageに保存
      setPassword('');
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ログアウト
  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthToken('');
    localStorage.removeItem('authToken'); // LocalStorageから削除
  };

  // 投稿を作成
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create post');
      }

      setContent('');
      await fetchPosts();
    } catch (err) {
      console.error('Error creating post:', err);
      setError(err instanceof Error ? err.message : '投稿に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 投稿を削除
  const handleDelete = async (postId: number) => {
    if (!confirm('この投稿を削除しますか？')) return;

    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete post');
      }

      await fetchPosts();
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('削除に失敗しました');
    }
  };

  // 認証前
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto p-4 sm:p-6 min-h-screen flex items-center justify-center">
        <div className="w-full">
          <h1 className="text-2xl font-normal mb-6">Admin Login</h1>
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-3 bg-foreground/5 border border-foreground/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground/20"
              autoFocus
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </form>
        </div>
      </div>
    );
  }

  // 認証後
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-normal">
          Admin <span className="text-foreground/40">|</span>{' '}
          <a href="/" className="hover:opacity-70 transition-opacity">
            Timeline
          </a>
        </h1>
        <button
          onClick={handleLogout}
          className="text-sm text-foreground/60 hover:text-foreground transition-opacity"
        >
          Logout
        </button>
      </header>

      {/* 投稿フォーム */}
      <form onSubmit={handleSubmit} className="mb-8">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-3 bg-foreground/5 border border-foreground/10 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-foreground/20"
          rows={3}
          maxLength={280}
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-foreground/40">
            {content.length} / 280
          </span>
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="px-4 py-2 bg-foreground text-background rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {loading ? '投稿中...' : '投稿'}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}
      </form>

      {/* タイムライン */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <p className="text-foreground/40 text-center py-8">
            まだ投稿がありません
          </p>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className="p-4 bg-foreground/5 border border-foreground/10 rounded-lg"
            >
              <div className="flex justify-between items-start mb-2">
                <p className="whitespace-pre-wrap break-words flex-1">
                  {post.content}
                </p>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="ml-4 text-red-500 hover:text-red-400 text-sm"
                >
                  削除
                </button>
              </div>
              <time className="text-sm text-foreground/40">
                {new Date(post.created_at).toLocaleString('ja-JP')}
              </time>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

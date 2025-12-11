'use client';

import { useState, useEffect } from 'react';
import type { Post } from '../../types';
import { linkifyContent } from '../../utils/linkify';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 画像関連
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // 投稿一覧を取得
  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/posts`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  };

  // 初回読み込み（認証状態確認 + 投稿取得）
  useEffect(() => {
    // 認証状態は自動チェック（Cookieベース）
    checkAuth();
    fetchPosts();
  }, []);

  // 認証状態を確認（投稿作成APIで401が返ればログアウト状態）
  const checkAuth = async () => {
    try {
      // 認証が必要なエンドポイントにリクエストして確認
      const res = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '' }),
      });
      // 空コンテンツなので400が返るが、401でなければ認証済み
      if (res.status !== 401) {
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // 認証（HttpOnly Cookieで管理）
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // パスワードを送信してHttpOnly Cookieを取得
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
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
      if (data.success) {
        setIsAuthenticated(true);
        setPassword('');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ログアウト（Cookieを削除）
  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout error:', err);
      // エラーでもログアウト状態にする
      setIsAuthenticated(false);
    }
  };

  // 画像選択
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // サイズチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
      setError('画像は5MB以下にしてください');
      return;
    }

    // タイプチェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('対応形式: JPEG, PNG, GIF, WebP');
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  // 画像削除
  const handleImageRemove = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview(null);
  };

  // 画像アップロード
  const uploadImage = async (file: File): Promise<string | null> => {
    setUploadingImage(true);
    try {
      const res = await fetch(`${API_URL}/api/media`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const data = await res.json();
      return data.url;
    } catch (err) {
      console.error('Error uploading image:', err);
      throw err;
    } finally {
      setUploadingImage(false);
    }
  };

  // 投稿を作成
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // 画像があればアップロード
      let imageUrl: string | undefined;
      if (selectedImage) {
        imageUrl = (await uploadImage(selectedImage)) || undefined;
      }

      const res = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, image_url: imageUrl }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create post');
      }

      setContent('');
      handleImageRemove();
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
        credentials: 'include',
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

  // 認証チェック中
  if (isCheckingAuth) {
    return (
      <div className="max-w-md mx-auto p-4 sm:p-6 min-h-screen flex items-center justify-center">
        <p className="text-foreground/40">Loading...</p>
      </div>
    );
  }

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
          maxLength={2000}
        />

        {/* 画像プレビュー */}
        {imagePreview && (
          <div className="mt-2 relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-48 rounded-lg border border-foreground/10"
            />
            <button
              type="button"
              onClick={handleImageRemove}
              className="absolute -top-2 -right-2 w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center text-sm hover:opacity-80 transition-opacity"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-3">
            <label className="cursor-pointer text-sm text-foreground/60 hover:text-foreground transition-colors">
              [+ Image]
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageSelect}
                className="hidden"
                disabled={loading || uploadingImage}
              />
            </label>
            <span className="text-sm text-foreground/40">
              {content.length} / 2000
            </span>
          </div>
          <button
            type="submit"
            disabled={loading || uploadingImage || !content.trim()}
            className="px-4 py-2 bg-foreground text-background rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {uploadingImage ? '画像アップロード中...' : loading ? '投稿中...' : '投稿'}
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
              <p className="whitespace-pre-wrap break-words mb-2">
                {linkifyContent(post.content)}
              </p>
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt=""
                  className="max-w-full max-h-96 rounded-lg border border-foreground/10 mb-2"
                />
              )}
              <div className="flex justify-between items-center">
                <time className="text-sm text-foreground/40">
                  {new Date(post.created_at).toLocaleString('ja-JP')}
                </time>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="text-red-500 hover:text-red-400 text-sm"
                >
                  削除
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

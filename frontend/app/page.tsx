'use client';

import { useState, useEffect } from 'react';
import type { Post } from '../types';
import { linkifyContent } from '../utils/linkify';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // 投稿一覧を取得
  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/posts`);
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  // 初回読み込み
  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-normal">
          Microblog <span className="text-foreground/40">|</span>{' '}
          <a href="https://krnk.app" className="hover:opacity-70 transition-opacity">
            Blog
          </a>
        </h1>
      </header>

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

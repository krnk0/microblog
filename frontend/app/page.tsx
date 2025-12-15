'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Post } from '../types';
import { formatContent } from '../utils/formatContent';

declare const Prism: { highlightAll: () => void } | undefined;
declare const renderMathInElement: ((element: Element, options?: object) => void) | undefined;

interface Pagination {
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

function HomeContent() {
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [posts, setPosts] = useState<Post[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);

  // 投稿一覧を取得
  const fetchPosts = async (page: number) => {
    try {
      const res = await fetch(`${API_URL}/api/posts?page=${page}`);
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data.posts || []);
      setPagination(data.pagination || null);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  // ページ変更時に再取得
  useEffect(() => {
    fetchPosts(currentPage);
  }, [currentPage]);

  // Prism.js でシンタックスハイライト
  useEffect(() => {
    if (typeof Prism !== 'undefined') {
      Prism.highlightAll();
    }
  }, [posts]);

  // KaTeX で数式レンダリング
  useEffect(() => {
    if (typeof renderMathInElement !== 'undefined') {
      const container = document.querySelector('.space-y-4');
      if (container) {
        renderMathInElement(container, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
          ],
          throwOnError: false,
        });
      }
    }
  }, [posts]);

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
            <a
              key={post.id}
              href={`/posts/${post.id}`}
              className="block p-4 bg-foreground/5 border border-foreground/10 rounded-lg hover:bg-foreground/10 transition-colors"
            >
              <div className="whitespace-pre-wrap break-words mb-2">
                {formatContent(post.content)}
              </div>
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
            </a>
          ))
        )}
      </div>

      {/* ページネーション */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-4 mt-8">
          {pagination.hasPrev ? (
            <a
              href={currentPage === 2 ? '/' : `/?page=${currentPage - 1}`}
              className="px-4 py-2 bg-foreground/5 border border-foreground/10 rounded-lg hover:bg-foreground/10 transition-colors"
            >
              ←
            </a>
          ) : (
            <span className="px-4 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground/20 cursor-not-allowed">
              ←
            </span>
          )}
          {pagination.hasNext ? (
            <a
              href={`/?page=${currentPage + 1}`}
              className="px-4 py-2 bg-foreground/5 border border-foreground/10 rounded-lg hover:bg-foreground/10 transition-colors"
            >
              →
            </a>
          ) : (
            <span className="px-4 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground/20 cursor-not-allowed">
              →
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto p-4 sm:p-6"><p className="text-foreground/40">Loading...</p></div>}>
      <HomeContent />
    </Suspense>
  );
}

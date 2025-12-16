'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Post } from '../types';
import { PostList, Pagination } from '../components';

interface PaginationData {
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
  const [pagination, setPagination] = useState<PaginationData | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch(`${API_URL}/api/posts?page=${currentPage}`);
        if (!res.ok) throw new Error('Failed to fetch posts');
        const data = await res.json();
        setPosts(data.posts || []);
        setPagination(data.pagination || null);
      } catch (err) {
        console.error('Error fetching posts:', err);
      }
    };
    fetchPosts();
  }, [currentPage]);

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

      <PostList posts={posts} />

      {pagination && (
        <Pagination
          pagination={pagination}
          currentPage={currentPage}
          basePath="/"
        />
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

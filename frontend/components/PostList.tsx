'use client';

import { useEffect } from 'react';
import type { Post } from '../types';
import { PostCard } from './PostCard';

declare const Prism: { highlightAll: () => void } | undefined;
declare const renderMathInElement: ((element: Element, options?: object) => void) | undefined;

interface Props {
  posts: Post[];
  showDelete?: boolean;
  onDelete?: (id: number) => void;
}

export function PostList({ posts, showDelete, onDelete }: Props) {
  // Prism.js でシンタックスハイライト
  useEffect(() => {
    if (typeof Prism !== 'undefined') {
      Prism.highlightAll();
    }
  }, [posts]);

  // KaTeX で数式レンダリング
  useEffect(() => {
    if (typeof renderMathInElement !== 'undefined') {
      const container = document.querySelector('.post-list');
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

  if (posts.length === 0) {
    return (
      <p className="text-foreground/40 text-center py-8">
        まだ投稿がありません
      </p>
    );
  }

  return (
    <div className="post-list space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          showDelete={showDelete}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

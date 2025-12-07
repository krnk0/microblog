'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { Post } from '../../../types';
import { linkifyContent } from '../../../utils/linkify';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function PostPage() {
  const params = useParams();
  const id = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`${API_URL}/api/posts/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Post not found');
          } else {
            throw new Error('Failed to fetch post');
          }
          return;
        }
        const data = await res.json();
        setPost(data.post);
      } catch (err) {
        console.error('Error fetching post:', err);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPost();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <p className="text-foreground/40 text-center py-8">Loading...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <p className="text-foreground/40 text-center py-8">{error || 'Post not found'}</p>
        <div className="text-center">
          <a href="/" className="text-foreground/60 hover:text-foreground transition-colors">
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-normal">
          <a href="/" className="hover:opacity-70 transition-opacity">
            Microblog
          </a>
        </h1>
      </header>

      <article className="p-4 bg-foreground/5 border border-foreground/10 rounded-lg">
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

      <div className="mt-4 text-center">
        <a href="/" className="text-foreground/60 hover:text-foreground transition-colors">
          View all posts
        </a>
      </div>
    </div>
  );
}

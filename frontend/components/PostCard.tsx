import type { Post } from '../types';
import { formatContent } from '../utils/formatContent';

interface Props {
  post: Post;
  showDelete?: boolean;
  onDelete?: (id: number) => void;
}

export function PostCard({ post, showDelete, onDelete }: Props) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(post.id);
  };

  return (
    <a
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
      <div className="flex justify-between items-center">
        <time className="text-sm text-foreground/40">
          {new Date(post.created_at).toLocaleString('ja-JP')}
        </time>
        {showDelete && onDelete && (
          <button
            onClick={handleDelete}
            className="text-red-500 hover:text-red-400 text-sm"
          >
            削除
          </button>
        )}
      </div>
    </a>
  );
}

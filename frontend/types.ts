export interface Post {
  id: number;
  content: string;
  image_url?: string;
  created_at: string;
}

export interface CreatePostRequest {
  content: string;
  image_url?: string;
}

export interface GetPostsResponse {
  posts: Post[];
}

export interface CreatePostResponse {
  post: Post;
}

export interface ErrorResponse {
  error: string;
}

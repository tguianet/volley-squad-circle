export type FeedAuthor = {
  id: string;
  display_name: string | null;
  username: string | null;
  apelido: string | null;
  avatar_url: string | null;
};

export type FeedPost = {
  id: string;
  user_id: string;
  image_url: string | null;
  description: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  author: FeedAuthor | null;
};

export type FeedComment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: FeedAuthor | null;
};

export type FeedComposerProfile = {
  display_name: string | null;
  apelido: string | null;
  avatar_url: string | null;
};

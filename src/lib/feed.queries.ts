import { untyped } from "@/lib/supabase-untyped";
import { supabase } from "@/integrations/supabase/client";
import type { FeedAuthor, FeedComment, FeedItem, FeedPost, FeedShare } from "@/lib/feed.types";

type RawPhotoRow = {
  id: string;
  user_id: string;
  image_url: string | null;
  description: string | null;
  created_at: string;
  gallery_likes: { user_id: string }[] | null;
  gallery_comments: { id: string }[] | null;
};

type RawShareRow = {
  id: string;
  original_post_id: string;
  shared_by_user_id: string;
  comment: string | null;
  created_at: string;
  gallery_photos: RawPhotoRow;
};

async function attachAuthors(userIds: string[]): Promise<Map<string, FeedAuthor>> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return new Map();
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, display_name, username, apelido, avatar_url")
    .in("id", unique);
  return new Map(
    (profs ?? []).map((p) => [
      p.id,
      {
        id: p.id,
        display_name: p.display_name,
        username: p.username,
        apelido: p.apelido,
        avatar_url: p.avatar_url,
      },
    ]),
  );
}

function mapPhotoToPost(
  photo: RawPhotoRow,
  authorMap: Map<string, FeedAuthor>,
  currentUserId: string | null,
): FeedPost {
  const likes = photo.gallery_likes ?? [];
  return {
    id: photo.id,
    user_id: photo.user_id,
    image_url: photo.image_url,
    description: photo.description,
    created_at: photo.created_at,
    like_count: likes.length,
    comment_count: photo.gallery_comments?.length ?? 0,
    liked_by_me: !!currentUserId && likes.some((l) => l.user_id === currentUserId),
    author: authorMap.get(photo.user_id) ?? null,
  };
}

function mapShareRow(
  row: RawShareRow,
  authorMap: Map<string, FeedAuthor>,
  currentUserId: string | null,
): FeedShare {
  const originalPost = mapPhotoToPost(row.gallery_photos, authorMap, currentUserId);
  return {
    id: row.id,
    shared_by_user_id: row.shared_by_user_id,
    original_post_id: row.original_post_id,
    comment: row.comment,
    created_at: row.created_at,
    sharer: authorMap.get(row.shared_by_user_id) ?? null,
    original_post: originalPost,
  };
}

function mergeFeedItems(posts: FeedPost[], shares: FeedShare[]): FeedItem[] {
  const items: FeedItem[] = [
    ...posts.map((post) => ({ kind: "post" as const, post, sort_at: post.created_at })),
    ...shares.map((share) => ({ kind: "share" as const, share, sort_at: share.created_at })),
  ];
  return items
    .sort((a, b) => new Date(b.sort_at).getTime() - new Date(a.sort_at).getTime())
    .slice(0, 50);
}

async function fetchShares(
  currentUserId: string | null,
  filter?: { sharedByUserId?: string },
): Promise<FeedShare[]> {
  let query = untyped()
    .from("post_shares")
    .select(
      `
      id,
      original_post_id,
      shared_by_user_id,
      comment,
      created_at,
      gallery_photos (
        id,
        user_id,
        image_url,
        description,
        created_at,
        gallery_likes ( user_id ),
        gallery_comments ( id )
      )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (filter?.sharedByUserId) {
    query = query.eq("shared_by_user_id", filter.sharedByUserId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as RawShareRow[];

  const authorIds = rows.flatMap((r) => [r.shared_by_user_id, r.gallery_photos.user_id]);
  const authorMap = await attachAuthors(authorIds);
  return rows.map((r) => mapShareRow(r, authorMap, currentUserId));
}

async function fetchPosts(
  currentUserId: string | null,
  filter?: { userId?: string },
): Promise<FeedPost[]> {
  let query = supabase
    .from("gallery_photos")
    .select(
      "id, user_id, image_url, description, created_at, gallery_likes(user_id), gallery_comments(id)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (filter?.userId) {
    query = query.eq("user_id", filter.userId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const photos = (data ?? []) as RawPhotoRow[];
  const ids = Array.from(new Set(photos.map((p) => p.user_id)));
  const authorMap = await attachAuthors(ids);
  return photos.map((p) => mapPhotoToPost(p, authorMap, currentUserId));
}

export async function fetchGlobalFeed(currentUserId: string | null): Promise<FeedItem[]> {
  const posts = await fetchPosts(currentUserId);
  return mergeFeedItems(posts, []);
}

export async function fetchProfileFeed(
  profileId: string,
  currentUserId: string | null,
): Promise<FeedItem[]> {
  const posts = await fetchPosts(currentUserId, { userId: profileId });
  return mergeFeedItems(posts, []);
}

export async function createPostShare(
  originalPostId: string,
  comment: string | null,
): Promise<void> {
  const trimmed = comment?.trim() ?? "";
  const { error } = await supabase.rpc("share_gallery_post", {
    p_original_post_id: originalPostId,
    p_comment: trimmed.length > 0 ? trimmed : undefined,
  });
  if (error) throw error;
}

export async function togglePostLike(postId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("toggle_gallery_like", {
    p_photo_id: postId,
  });
  if (error) throw error;
  return data === true;
}

export async function addPostComment(postId: string, content: string): Promise<string> {
  const { data, error } = await supabase.rpc("add_gallery_comment", {
    p_photo_id: postId,
    p_content: content,
  });
  if (error) throw error;
  if (typeof data !== "string") {
    throw new Error("Não foi possível salvar o comentário.");
  }
  return data;
}

export async function deletePostShare(shareId: string, userId: string): Promise<void> {
  const { error } = await untyped()
    .from("post_shares")
    .delete()
    .eq("id", shareId)
    .eq("shared_by_user_id", userId);
  if (error) throw error;
}

export async function fetchPostComments(postId: string): Promise<FeedComment[]> {
  const { data, error } = await supabase
    .from("gallery_comments")
    .select("id, user_id, content, created_at")
    .eq("photo_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = data ?? [];
  const ids = Array.from(new Set(rows.map((c) => c.user_id)));
  const authorMap = await attachAuthors(ids);
  return rows.map((c) => ({
    id: c.id,
    user_id: c.user_id,
    content: c.content,
    created_at: c.created_at,
    author: authorMap.get(c.user_id) ?? null,
  }));
}

export async function fetchProfileRankingPosition(profileId: string): Promise<number | null> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("pontos")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError || !profile) return null;

  const { count, error: countError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gt("pontos", profile.pontos ?? 0);
  if (countError) return null;
  return (count ?? 0) + 1;
}

export function authorDisplayName(author: FeedAuthor | null): string {
  return author?.display_name || author?.apelido || author?.username || "Jogador";
}

export function authorHandle(author: FeedAuthor | null): string {
  const handle = author?.apelido ?? author?.username ?? "";
  return handle.replace(/^@/, "");
}

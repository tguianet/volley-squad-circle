import { supabase } from "@/integrations/supabase/client";
import type { FeedAuthor, FeedComment, FeedPost } from "@/lib/feed.types";

type RawPhotoRow = {
  id: string;
  user_id: string;
  image_url: string | null;
  description: string | null;
  created_at: string;
  gallery_likes: { user_id: string }[] | null;
  gallery_comments: { id: string }[] | null;
};

async function attachAuthors(userIds: string[]): Promise<Map<string, FeedAuthor>> {
  if (userIds.length === 0) return new Map();
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, display_name, username, apelido, avatar_url")
    .in("id", userIds);
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

export async function fetchGlobalFeed(currentUserId: string | null): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from("gallery_photos")
    .select(
      "id, user_id, image_url, description, created_at, gallery_likes(user_id), gallery_comments(id)",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  const photos = (data ?? []) as RawPhotoRow[];
  const ids = Array.from(new Set(photos.map((p) => p.user_id)));
  const authorMap = await attachAuthors(ids);
  return photos.map((p) => mapPhotoToPost(p, authorMap, currentUserId));
}

export async function fetchProfileFeed(
  profileId: string,
  currentUserId: string | null,
): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from("gallery_photos")
    .select(
      "id, user_id, image_url, description, created_at, gallery_likes(user_id), gallery_comments(id)",
    )
    .eq("user_id", profileId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;

  const photos = (data ?? []) as RawPhotoRow[];
  const authorMap = await attachAuthors([profileId]);
  return photos.map((p) => mapPhotoToPost(p, authorMap, currentUserId));
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

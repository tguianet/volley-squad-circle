import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type PhotoRow = {
  id: string;
  user_id: string;
  image_url: string;
  description: string | null;
  created_at: string;
  gallery_likes: { user_id: string }[];
  gallery_comments: { id: string }[];
  profiles: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
};

type CommentRow = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
};

async function fetchFeed(): Promise<PhotoRow[]> {
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("id, user_id, image_url, description, created_at, gallery_likes(user_id), gallery_comments(id)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  const photos = (data ?? []) as Omit<PhotoRow, "profiles">[];
  const ids = Array.from(new Set(photos.map((p) => p.user_id)));
  if (ids.length === 0) return [];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .in("id", ids);
  const map = new Map((profs ?? []).map((p) => [p.id, p]));
  return photos.map((p) => ({ ...p, profiles: map.get(p.user_id) ?? null })) as PhotoRow[];
}


export function GalleryFeed() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const feedQ = useQuery({ queryKey: ["gallery_feed"], queryFn: fetchFeed, enabled: authChecked });

  const likeMut = useMutation({
    mutationFn: async ({ photoId, liked }: { photoId: string; liked: boolean }) => {
      if (!userId) throw new Error("Entre para curtir");
      if (liked) {
        const { error } = await supabase.from("gallery_likes").delete().eq("photo_id", photoId).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gallery_likes").insert({ photo_id: photoId, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gallery_feed"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!authChecked || feedQ.isLoading) {
    return (
      <div className="py-8 flex justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground"/></div>
    );
  }

  const photos = feedQ.data ?? [];
  if (photos.length === 0) return null;

  return (
    <div className="space-y-5">
      {photos.map((p) => (
        <FeedPhotoCard
          key={p.id}
          photo={p}
          userId={userId}
          onLike={(liked) => likeMut.mutate({ photoId: p.id, liked })}
        />
      ))}
    </div>
  );
}

function FeedPhotoCard({ photo, userId, onLike }: { photo: PhotoRow; userId: string | null; onLike: (liked: boolean) => void }) {
  const likes = photo.gallery_likes ?? [];
  const liked = !!userId && likes.some((l) => l.user_id === userId);
  const [showComments, setShowComments] = useState(false);
  const name = photo.profiles?.display_name || photo.profiles?.username || "Jogador";

  return (
    <Card className="p-4 shadow-card space-y-3">
      <div className="flex items-center gap-3">
        <Avatar className="size-10">
          {photo.profiles?.avatar_url && <AvatarImage src={photo.profiles.avatar_url} />}
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{name}</div>
          <div className="text-xs text-muted-foreground">{new Date(photo.created_at).toLocaleString("pt-BR")}</div>
        </div>
      </div>

      {photo.description && <p className="text-sm whitespace-pre-wrap">{photo.description}</p>}

      <SignedImg path={photo.image_url} className="w-full max-h-[70vh] object-cover rounded-lg bg-secondary" />

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onLike(liked)}
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-semibold rounded-full px-3 py-1.5 transition",
            liked ? "bg-destructive/15 text-destructive" : "bg-secondary text-muted-foreground hover:text-foreground",
          )}
        >
          <Heart className={cn("size-4", liked && "fill-current")} /> {likes.length}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-full px-3 py-1.5 bg-secondary text-muted-foreground hover:text-foreground transition"
        >
          <MessageCircle className="size-4" /> {photo.gallery_comments?.length ?? 0}
        </button>
      </div>

      {showComments && <CommentSection photoId={photo.id} userId={userId} />}
    </Card>
  );
}

function CommentSection({ photoId, userId }: { photoId: string; userId: string | null }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const commentsQ = useQuery({
    queryKey: ["gallery_comments", photoId],
    queryFn: async (): Promise<CommentRow[]> => {
      const { data, error } = await supabase
        .from("gallery_comments")
        .select("id, user_id, content, created_at")
        .eq("photo_id", photoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as Omit<CommentRow, "profiles">[];
      const ids = Array.from(new Set(rows.map((c) => c.user_id)));
      if (ids.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return rows.map((c) => ({ ...c, profiles: map.get(c.user_id) ?? null })) as CommentRow[];
    },
  });


  const addMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Entre para comentar");
      const content = text.trim();
      if (!content) return;
      const { error } = await supabase.from("gallery_comments").insert({ photo_id: photoId, user_id: userId, content });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["gallery_comments", photoId] });
      qc.invalidateQueries({ queryKey: ["gallery_feed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gallery_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gallery_comments", photoId] });
      qc.invalidateQueries({ queryKey: ["gallery_feed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="pt-2 border-t border-border/60 space-y-3">
      {commentsQ.isLoading ? (
        <div className="py-3 flex justify-center"><Loader2 className="size-4 animate-spin text-muted-foreground"/></div>
      ) : (
        <div className="space-y-2.5">
          {(commentsQ.data ?? []).map((c) => {
            const cn2 = c.profiles?.display_name || c.profiles?.username || "Jogador";
            return (
              <div key={c.id} className="flex gap-2.5 group">
                <Avatar className="size-7 mt-0.5">
                  {c.profiles?.avatar_url && <AvatarImage src={c.profiles.avatar_url} />}
                  <AvatarFallback className="text-[10px]">{cn2.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 rounded-2xl bg-secondary/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold truncate">{cn2}</div>
                    {userId === c.user_id && (
                      <button
                        onClick={() => delMut.mutate(c.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                        aria-label="Remover"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words">{c.content}</div>
                </div>
              </div>
            );
          })}
          {(commentsQ.data ?? []).length === 0 && (
            <div className="text-xs text-muted-foreground py-1">Seja o primeiro a comentar.</div>
          )}
        </div>
      )}

      {userId ? (
        <form
          onSubmit={(e) => { e.preventDefault(); addMut.mutate(); }}
          className="flex items-center gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            placeholder="Escreva um comentário..."
            className="flex-1 rounded-full bg-secondary/60 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Button type="submit" size="sm" disabled={!text.trim() || addMut.isPending}>
            {addMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      ) : (
        <div className="text-xs text-muted-foreground">Entre para comentar.</div>
      )}
    </div>
  );
}

function SignedImg({ path, className }: { path: string; className?: string }) {
  const { data } = useQuery({
    queryKey: ["gallery-signed", path],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("gallery").createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 50 * 60 * 1000,
  });
  if (!data) return <div className={cn("animate-pulse", className)} />;
  return <img src={data} alt="" className={className} />;
}

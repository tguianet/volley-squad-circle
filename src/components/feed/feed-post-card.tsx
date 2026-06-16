import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl } from "@/components/avatar-thumb";
import { cn, getErrorMessage } from "@/lib/utils";
import { authorDisplayName, authorHandle } from "@/lib/feed.queries";
import { profileRoute } from "@/lib/profile-follow.utils";
import { formatRelativeTimeBR } from "@/lib/date-format";
import type { FeedPost } from "@/lib/feed.types";
import { SignedGalleryImage } from "@/components/feed/signed-gallery-image";
import { FeedPostComments } from "@/components/feed/feed-post-comments";

type FeedPostCardProps = {
  post: FeedPost;
  userId: string | null;
  feedQueryKey: readonly unknown[];
  compact?: boolean;
};

export function FeedPostCard({ post, userId, feedQueryKey, compact }: FeedPostCardProps) {
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const name = authorDisplayName(post.author);
  const handle = authorHandle(post.author);
  const { data: avatarUrl } = useAvatarUrl(post.author?.avatar_url);
  const profileLink = post.author
    ? profileRoute({
        username: post.author.username,
        apelido: post.author.apelido,
      })
    : { to: "/perfil" as const };

  const likeMut = useMutation({
    mutationFn: async (liked: boolean) => {
      if (!userId) throw new Error("Entre para curtir");
      if (liked) {
        const { error } = await supabase
          .from("gallery_likes")
          .delete()
          .eq("photo_id", post.id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("gallery_likes")
          .insert({ photo_id: post.id, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: feedQueryKey }),
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Erro ao curtir")),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!userId || userId !== post.user_id) throw new Error("Sem permissão");
      if (post.image_url) {
        await supabase.storage.from("gallery").remove([post.image_url]).catch(() => {});
      }
      const { error } = await supabase.from("gallery_photos").delete().eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Publicação removida");
      qc.invalidateQueries({ queryKey: feedQueryKey });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Erro ao remover")),
  });

  const handleShare = async () => {
    const text = post.description ?? "Confira no PlayBeach!";
    try {
      if (navigator.share) {
        await navigator.share({ title: "PlayBeach", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Texto copiado!");
      }
    } catch {
      toast.message("Compartilhamento cancelado");
    }
  };

  return (
    <Card className={cn("shadow-card border-border/80 overflow-hidden", compact ? "p-3" : "p-0")}>
      <div className={cn(compact ? "space-y-2.5" : "p-4 space-y-3")}>
        <div className="flex items-start gap-3">
          <Link {...profileLink} className="shrink-0">
            <Avatar className="size-10 ring-2 ring-primary/20">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
              <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link {...profileLink} className="text-sm font-semibold hover:underline truncate block">
                  {name}
                </Link>
                {handle ? (
                  <Link
                    {...profileLink}
                    className="text-xs text-muted-foreground hover:underline truncate block"
                  >
                    @{handle}
                  </Link>
                ) : null}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[11px] text-muted-foreground">
                  {formatRelativeTimeBR(post.created_at)}
                </span>
                {userId === post.user_id ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => deleteMut.mutate()}
                        disabled={deleteMut.isPending}
                      >
                        {deleteMut.isPending ? (
                          <Loader2 className="size-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="size-4 mr-2" />
                        )}
                        Excluir publicação
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {post.description ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.description}</p>
        ) : null}

        {post.image_url ? (
          <SignedGalleryImage
            path={post.image_url}
            className="w-full max-h-[70vh] object-cover rounded-xl bg-secondary"
          />
        ) : null}

        {(post.like_count > 0 || post.comment_count > 0) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
            {post.like_count > 0 ? (
              <span>
                {post.like_count} {post.like_count === 1 ? "curtida" : "curtidas"}
              </span>
            ) : null}
            {post.comment_count > 0 ? (
              <button
                type="button"
                onClick={() => setShowComments(true)}
                className="hover:underline"
              >
                {post.comment_count} {post.comment_count === 1 ? "comentário" : "comentários"}
              </button>
            ) : null}
          </div>
        )}

        <div className="flex items-center gap-1 pt-1 border-t border-border/50">
          <button
            type="button"
            onClick={() => likeMut.mutate(post.liked_by_me)}
            disabled={likeMut.isPending}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2 transition",
              post.liked_by_me
                ? "text-destructive bg-destructive/10"
                : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
            )}
          >
            <Heart className={cn("size-4", post.liked_by_me && "fill-current")} />
            Curtir
          </button>
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2 text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition"
          >
            <MessageCircle className="size-4" />
            Comentar
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2 text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition"
          >
            <Share2 className="size-4" />
            Compartilhar
          </button>
        </div>

        {showComments ? (
          <FeedPostComments postId={post.id} userId={userId} feedQueryKey={feedQueryKey} />
        ) : null}
      </div>
    </Card>
  );
}

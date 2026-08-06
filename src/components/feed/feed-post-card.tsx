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
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Loader2 } from "lucide-react";
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
import { FeedShareModal } from "@/components/feed/feed-share-modal";

type FeedPostCardProps = {
  post: FeedPost;
  userId: string | null;
  feedQueryKey: readonly unknown[];
  compact?: boolean;
};

export function FeedPostCard({ post, userId, feedQueryKey, compact }: FeedPostCardProps) {
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const name = authorDisplayName(post.author);
  const handle = authorHandle(post.author);
  const { data: avatarUrl } = useAvatarUrl(post.author?.avatar_url);
  const profileLink = post.author
    ? profileRoute({
        id: post.author.id,
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
        await supabase.storage
          .from("gallery")
          .remove([post.image_url])
          .catch(() => {});
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

  const handleShare = () => {
    if (!userId) {
      toast.error("Faça login para compartilhar");
      return;
    }
    setShareModalOpen(true);
  };

  return (
    <>
      <Card
        className={cn(
          "shadow-card border-border/60 overflow-hidden hover:shadow-card-hover transition-shadow duration-200",
          compact ? "p-3" : "p-0",
        )}
      >
        {!compact ? <div className="h-1 gradient-beach w-full" aria-hidden /> : null}
        <div className={cn(compact ? "space-y-2.5" : "p-4 sm:p-5 space-y-3")}>
          <div className="flex items-start gap-3">
            <Link {...profileLink} className="shrink-0">
              <Avatar className="size-11 ring-2 ring-primary/15 shadow-sm">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
                <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    {...profileLink}
                    className="text-sm font-bold hover:underline truncate block"
                  >
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
              className="block w-full h-auto object-contain rounded-2xl bg-secondary border border-border/40"
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

          <div className="flex items-center gap-0.5 pt-2 border-t border-border/50 -mx-1">
            <button
              type="button"
              onClick={() => likeMut.mutate(post.liked_by_me)}
              disabled={likeMut.isPending}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-xl py-2.5 transition",
                post.liked_by_me
                  ? "text-accent bg-accent/10"
                  : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
              )}
            >
              <Heart className={cn("size-4", post.liked_by_me && "fill-current")} />
              Curtir
            </button>
            <button
              type="button"
              onClick={() => setShowComments((v) => !v)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-xl py-2.5 text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition"
            >
              <MessageCircle className="size-4" />
              Comentar
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-xl py-2.5 text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition"
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

      <FeedShareModal
        post={post}
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        userId={userId}
        feedQueryKey={feedQueryKey}
      />
    </>
  );
}

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
  Repeat2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl } from "@/components/avatar-thumb";
import { cn, getErrorMessage } from "@/lib/utils";
import { authorDisplayName, deletePostShare } from "@/lib/feed.queries";
import { profileRoute } from "@/lib/profile-follow.utils";
import { formatRelativeTimeBR } from "@/lib/date-format";
import type { FeedShare } from "@/lib/feed.types";
import { FeedEmbeddedPost } from "@/components/feed/feed-embedded-post";
import { FeedPostComments } from "@/components/feed/feed-post-comments";
import { FeedShareModal } from "@/components/feed/feed-share-modal";

type FeedShareCardProps = {
  share: FeedShare;
  userId: string | null;
  feedQueryKey: readonly unknown[];
};

export function FeedShareCard({ share, userId, feedQueryKey }: FeedShareCardProps) {
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const sharerName = authorDisplayName(share.sharer);
  const originalName = authorDisplayName(share.original_post.author);
  const { data: sharerAvatarUrl } = useAvatarUrl(share.sharer?.avatar_url);
  const sharerProfileLink = share.sharer
    ? profileRoute({
        username: share.sharer.username,
        apelido: share.sharer.apelido,
      })
    : { to: "/perfil" as const };

  const original = share.original_post;

  const likeMut = useMutation({
    mutationFn: async (liked: boolean) => {
      if (!userId) throw new Error("Entre para curtir");
      if (liked) {
        const { error } = await supabase
          .from("gallery_likes")
          .delete()
          .eq("photo_id", original.id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("gallery_likes")
          .insert({ photo_id: original.id, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: feedQueryKey }),
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Erro ao curtir")),
  });

  const deleteShareMut = useMutation({
    mutationFn: async () => {
      if (!userId || userId !== share.shared_by_user_id) throw new Error("Sem permissão");
      await deletePostShare(share.id, userId);
    },
    onSuccess: () => {
      toast.success("Compartilhamento removido");
      qc.invalidateQueries({ queryKey: feedQueryKey });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Erro ao remover")),
  });

  return (
    <>
      <Card className="shadow-card border-border/80 overflow-hidden">
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Link {...sharerProfileLink} className="shrink-0">
              <Avatar className="size-10 ring-2 ring-primary/20">
                {sharerAvatarUrl ? <AvatarImage src={sharerAvatarUrl} alt={sharerName} /> : null}
                <AvatarFallback>{sharerName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm leading-snug">
                    <Link {...sharerProfileLink} className="font-semibold hover:underline">
                      {sharerName}
                    </Link>{" "}
                    <span className="text-muted-foreground inline-flex items-center gap-1">
                      <Repeat2 className="size-3.5 inline shrink-0" />
                      compartilhou uma publicação de{" "}
                      <span className="font-medium text-foreground">{originalName}</span>
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelativeTimeBR(share.created_at)}
                  </span>
                  {userId === share.shared_by_user_id ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => deleteShareMut.mutate()}
                          disabled={deleteShareMut.isPending}
                        >
                          {deleteShareMut.isPending ? (
                            <Loader2 className="size-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="size-4 mr-2" />
                          )}
                          Remover compartilhamento
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {share.comment ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{share.comment}</p>
          ) : null}

          <FeedEmbeddedPost post={original} />

          {(original.like_count > 0 || original.comment_count > 0) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
              {original.like_count > 0 ? (
                <span>
                  {original.like_count} {original.like_count === 1 ? "curtida" : "curtidas"}
                </span>
              ) : null}
              {original.comment_count > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowComments(true)}
                  className="hover:underline"
                >
                  {original.comment_count}{" "}
                  {original.comment_count === 1 ? "comentário" : "comentários"}
                </button>
              ) : null}
            </div>
          )}

          <div className="flex items-center gap-1 pt-1 border-t border-border/50">
            <button
              type="button"
              onClick={() => likeMut.mutate(original.liked_by_me)}
              disabled={likeMut.isPending}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2 transition",
                original.liked_by_me
                  ? "text-destructive bg-destructive/10"
                  : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
              )}
            >
              <Heart className={cn("size-4", original.liked_by_me && "fill-current")} />
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
              onClick={() => {
                if (!userId) {
                  toast.error("Faça login para compartilhar");
                  return;
                }
                setShareModalOpen(true);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2 text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition"
            >
              <Share2 className="size-4" />
              Compartilhar
            </button>
          </div>

          {showComments ? (
            <FeedPostComments
              postId={original.id}
              userId={userId}
              feedQueryKey={feedQueryKey}
            />
          ) : null}
        </div>
      </Card>

      <FeedShareModal
        post={original}
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        userId={userId}
        feedQueryKey={feedQueryKey}
      />
    </>
  );
}

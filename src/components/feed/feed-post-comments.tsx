import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl } from "@/components/avatar-thumb";
import { authorDisplayName } from "@/lib/feed.queries";
import { fetchPostComments } from "@/lib/feed.queries";
import { formatRelativeTimeBR } from "@/lib/date-format";

type FeedPostCommentsProps = {
  postId: string;
  userId: string | null;
  feedQueryKey: readonly unknown[];
};

function CommentAvatar({ author }: { author: { avatar_url: string | null; display_name: string | null } }) {
  const { data: url } = useAvatarUrl(author.avatar_url);
  const name = author.display_name ?? "?";
  return (
    <Avatar className="size-7 mt-0.5 shrink-0">
      {url ? <AvatarImage src={url} alt={name} /> : null}
      <AvatarFallback className="text-[10px]">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

export function FeedPostComments({ postId, userId, feedQueryKey }: FeedPostCommentsProps) {
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const commentsQ = useQuery({
    queryKey: ["gallery_comments", postId],
    queryFn: () => fetchPostComments(postId),
  });

  const addMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Entre para comentar");
      const content = text.trim();
      if (!content) return;
      const { error } = await supabase
        .from("gallery_comments")
        .insert({ photo_id: postId, user_id: userId, content });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["gallery_comments", postId] });
      qc.invalidateQueries({ queryKey: feedQueryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gallery_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gallery_comments", postId] });
      qc.invalidateQueries({ queryKey: feedQueryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="pt-3 border-t border-border/60 space-y-3">
      {commentsQ.isLoading ? (
        <div className="py-3 flex justify-center">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2.5">
          {(commentsQ.data ?? []).map((c) => {
            const name = authorDisplayName(c.author);
            return (
              <div key={c.id} className="flex gap-2.5 group">
                <CommentAvatar
                  author={{
                    avatar_url: c.author?.avatar_url ?? null,
                    display_name: c.author?.display_name ?? name,
                  }}
                />
                <div className="flex-1 min-w-0 rounded-2xl bg-secondary/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold truncate">{name}</div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatRelativeTimeBR(c.created_at)}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2 mt-0.5">
                    <div className="text-sm whitespace-pre-wrap break-words">{c.content}</div>
                    {userId === c.user_id ? (
                      <button
                        type="button"
                        onClick={() => delMut.mutate(c.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition shrink-0"
                        aria-label="Remover comentário"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
          {(commentsQ.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">Seja o primeiro a comentar.</p>
          ) : null}
        </div>
      )}

      {userId ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMut.mutate();
          }}
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
            {addMut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">Entre para comentar.</p>
      )}
    </div>
  );
}

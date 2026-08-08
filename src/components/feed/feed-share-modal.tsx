import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createPostShare } from "@/lib/feed.queries";
import { getErrorMessage } from "@/lib/utils";
import type { FeedPost } from "@/lib/feed.types";

type FeedShareModalProps = {
  post: FeedPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  feedQueryKey: readonly unknown[];
};

export function FeedShareModal({
  post,
  open,
  onOpenChange,
  userId,
  feedQueryKey,
}: FeedShareModalProps) {
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const shareMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Faça login para compartilhar");
      if (!post) throw new Error("Publicação indisponível");
      await createPostShare(post.id, comment);
    },
    onSuccess: () => {
      toast.success("Compartilhado no seu feed!");
      setComment("");
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: feedQueryKey });
      qc.invalidateQueries({ queryKey: ["gallery_feed"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Erro ao compartilhar")),
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) setComment("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar publicação</DialogTitle>
        </DialogHeader>

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Escreva um comentário (opcional)..."
          rows={3}
          maxLength={1000}
          className="resize-none"
        />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="gradient-beach text-white border-0"
            disabled={!userId || shareMut.isPending}
            onClick={() => shareMut.mutate()}
          >
            {shareMut.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
            Compartilhar no meu feed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

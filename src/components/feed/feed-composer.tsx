import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, Video, Trophy, Send, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl } from "@/components/avatar-thumb";
import { getErrorMessage } from "@/lib/utils";
import type { FeedComposerProfile } from "@/lib/feed.types";

type FeedComposerProps = {
  userId: string | null;
  profile: FeedComposerProfile | null | undefined;
  feedQueryKey: readonly unknown[];
  placeholder?: string;
  expandedByDefault?: boolean;
};

export function FeedComposer({
  userId,
  profile,
  feedQueryKey,
  placeholder,
  expandedByDefault = false,
}: FeedComposerProps) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(expandedByDefault);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const firstName = (profile?.display_name ?? "jogador").split(" ")[0];
  const { data: avatarUrl } = useAvatarUrl(profile?.avatar_url);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const postMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Faça login para publicar");
      const content = text.trim();
      if (!content && !file) throw new Error("Escreva algo ou adicione uma foto");

      let imagePath: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        imagePath = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("gallery")
          .upload(imagePath, file, { contentType: file.type });
        if (upErr) throw upErr;
      }

      const { error: insErr } = await supabase.from("gallery_photos").insert({
        user_id: userId,
        image_url: imagePath ?? "",
        description: content || "",
      });

      if (insErr) {
        if (imagePath) {
          await supabase.storage
            .from("gallery")
            .remove([imagePath])
            .catch(() => {});
        }
        throw insErr;
      }
    },
    onSuccess: () => {
      toast.success("Publicado!");
      setText("");
      setFile(null);
      setExpanded(false);
      qc.invalidateQueries({ queryKey: feedQueryKey });
      qc.invalidateQueries({ queryKey: ["gallery_photos"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Erro ao publicar")),
  });

  if (!userId) return null;

  return (
    <Card className="p-4 sm:p-5 shadow-card border-border/60 hover:shadow-card-hover transition-shadow">
      <div className="flex gap-3 sm:gap-4">
        <Avatar className="size-12 ring-2 ring-primary/20 shrink-0 shadow-sm">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={firstName} /> : null}
          <AvatarFallback>{firstName[0]?.toUpperCase() ?? "?"}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-3">
          {!expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full text-left bg-secondary/50 rounded-xl px-4 py-3.5 text-sm text-muted-foreground hover:bg-secondary/70 border border-border/40 transition"
            >
              {placeholder ?? `E aí, ${firstName}? Conta como foi o treino...`}
            </button>
          ) : (
            <div className="space-y-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder ?? `No que você está pensando sobre o vôlei hoje?`}
                rows={3}
                maxLength={2000}
                className="resize-none bg-card border-border/60"
                autoFocus
              />
              {preview ? (
                <div className="relative inline-block">
                  <img
                    src={preview}
                    alt="Prévia"
                    className="max-h-48 rounded-lg object-cover border border-border/60"
                  />
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="absolute top-1.5 right-1.5 size-6 rounded-full bg-background/90 flex items-center justify-center shadow"
                    aria-label="Remover imagem"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-0.5 text-muted-foreground">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setExpanded(true);
                    setFile(f);
                  }
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-medium hover:text-primary px-2.5 py-1.5 rounded-lg hover:bg-secondary/80 transition"
              >
                <ImageIcon className="size-4" /> Foto
              </button>
              <button
                type="button"
                onClick={() => toast.message("Upload de vídeo em breve!")}
                className="flex items-center gap-1.5 text-xs font-medium hover:text-primary px-2.5 py-1.5 rounded-lg hover:bg-secondary/80 transition"
              >
                <Video className="size-4" /> Vídeo
              </button>
              <Link
                to="/partidas/nova"
                className="flex items-center gap-1.5 text-xs font-medium hover:text-primary px-2.5 py-1.5 rounded-lg hover:bg-secondary/80 transition"
              >
                <Trophy className="size-4" /> Partida
              </Link>
            </div>

            <div className="flex gap-2">
              {expanded ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setExpanded(false);
                    setText("");
                    setFile(null);
                  }}
                >
                  Cancelar
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="beach"
                className="gap-1"
                disabled={postMut.isPending || (expanded && !text.trim() && !file)}
                onClick={() => {
                  if (!expanded) {
                    setExpanded(true);
                    return;
                  }
                  postMut.mutate();
                }}
              >
                {postMut.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                Postar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

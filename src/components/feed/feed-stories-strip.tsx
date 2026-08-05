import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAvatarUrl } from "@/components/avatar-thumb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

type FeedStoriesStripProps = {
  userId: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

type StoryRow = {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  profile: {
    display_name: string | null;
    apelido: string | null;
    avatar_url: string | null;
  } | null;
};

function StoryTile({
  story,
  onOpen,
}: {
  story: StoryRow;
  onOpen: (story: StoryRow, signedImg: string | null) => void;
}) {
  const { data: signedImg } = useQuery({
    queryKey: ["story-img", story.image_url],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data } = await supabase.storage
        .from("gallery")
        .createSignedUrl(story.image_url, 3600);
      return data?.signedUrl ?? null;
    },
  });
  const { data: signedAvatar } = useAvatarUrl(story.profile?.avatar_url);
  const name = story.profile?.apelido ?? story.profile?.display_name ?? "Jogador";
  return (
    <button
      type="button"
      className="flex flex-col items-center gap-1.5 shrink-0 group"
      onClick={() => onOpen(story, signedImg ?? null)}
    >
      <div className="size-[72px] rounded-full p-[3px] gradient-beach shadow-glow overflow-hidden">
        {signedImg ? (
          <img
            src={signedImg}
            alt={name}
            className="size-full rounded-full object-cover ring-2 ring-card"
          />
        ) : (
          <Avatar className="size-full ring-2 ring-card">
            {signedAvatar ? <AvatarImage src={signedAvatar} alt={name} /> : null}
            <AvatarFallback>{name[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
        )}
      </div>
      <span className="text-[11px] font-semibold text-foreground max-w-[72px] truncate">
        {name.split(" ")[0]}
      </span>
    </button>
  );
}

export function FeedStoriesStrip({ userId, displayName, avatarUrl }: FeedStoriesStripProps) {
  const firstName = (displayName ?? "Você").split(" ")[0];
  const { data: signedAvatar } = useAvatarUrl(avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewer, setViewer] = useState<{ story: StoryRow; img: string | null } | null>(null);
  const queryClient = useQueryClient();

  const storiesQ = useQuery({
    queryKey: ["active-stories"],
    staleTime: 30_000,
    queryFn: async (): Promise<StoryRow[]> => {
      const { data, error } = await supabase
        .from("stories")
        .select("id, user_id, image_url, created_at")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, apelido, avatar_url")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({
        ...r,
        profile: map.get(r.user_id)
          ? {
              display_name: map.get(r.user_id)!.display_name,
              apelido: map.get(r.user_id)!.apelido,
              avatar_url: map.get(r.user_id)!.avatar_url,
            }
          : null,
      }));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!userId) throw new Error("Faça login para postar stories.");
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `stories/${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("gallery")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase
        .from("stories")
        .insert({ user_id: userId, image_url: path });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      toast.success("Story publicado! Fica ativo por 24h.");
      setDialogOpen(false);
      setPendingFile(null);
      setPreviewUrl(null);
      queryClient.invalidateQueries({ queryKey: ["active-stories"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar story");
    },
  });

  function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem.");
      return;
    }
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setDialogOpen(true);
    e.target.value = "";
  }

  if (!userId) return null;

  const stories = storiesQ.data ?? [];
  const myStories = stories.filter((s) => s.user_id === userId);
  const otherStories = stories.filter((s) => s.user_id !== userId);

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-1.5 shrink-0 group"
        >
          <div className="relative">
            <div className="size-[72px] rounded-full p-[3px] gradient-beach shadow-glow">
              <Avatar className="size-full ring-2 ring-card">
                {signedAvatar ? <AvatarImage src={signedAvatar} alt={firstName} /> : null}
                <AvatarFallback>{firstName[0]?.toUpperCase() ?? "?"}</AvatarFallback>
              </Avatar>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 size-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center border-2 border-card shadow-sm">
              <Plus className="size-3.5" />
            </span>
          </div>
          <span className="text-[11px] font-semibold text-foreground max-w-[72px] truncate">
            Criar story
          </span>
        </button>

        {myStories.map((s) => (
          <StoryTile key={s.id} story={s} onOpen={(story, img) => setViewer({ story, img })} />
        ))}
        {otherStories.map((s) => (
          <StoryTile key={s.id} story={s} onOpen={(story, img) => setViewer({ story, img })} />
        ))}

        {stories.length === 0 && !storiesQ.isLoading ? (
          <Link to="/perfil" className="flex flex-col items-center gap-1.5 shrink-0 opacity-70">
            <div className="size-[72px] rounded-full border-2 border-dashed border-border/80 bg-secondary/50 flex items-center justify-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide text-center px-1">
                Sem stories
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">Poste o 1º</span>
          </Link>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFilePick}
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setPendingFile(null);
            setPreviewUrl(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Publicar story</DialogTitle>
          </DialogHeader>
          {previewUrl ? (
            <div className="rounded-xl overflow-hidden bg-secondary/40">
              <img
                src={previewUrl}
                alt="Pré-visualização"
                className="w-full max-h-[420px] object-contain"
              />
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">Seu story fica visível por 24 horas.</p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={uploadMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => pendingFile && uploadMutation.mutate(pendingFile)}
              disabled={!pendingFile || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Enviando…
                </>
              ) : (
                "Publicar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewer} onOpenChange={(open) => !open && setViewer(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-black border-0">
          <DialogHeader className="sr-only">
            <DialogTitle>
              Story de{" "}
              {viewer?.story.profile?.apelido ?? viewer?.story.profile?.display_name ?? "jogador"}
            </DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-[9/16] max-h-[80vh] bg-black flex items-center justify-center">
            {viewer?.img ? (
              <img src={viewer.img} alt="Story" className="w-full h-full object-contain" />
            ) : (
              <Loader2 className="size-8 animate-spin text-white" />
            )}
            <div className="absolute top-0 inset-x-0 p-3 flex items-center gap-2 bg-gradient-to-b from-black/60 to-transparent">
              <div className="size-8 rounded-full p-[2px] gradient-beach">
                <Avatar className="size-full ring-1 ring-black">
                  <AvatarFallback className="text-xs">
                    {(viewer?.story.profile?.apelido ??
                      viewer?.story.profile?.display_name ??
                      "?")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-sm font-semibold text-white truncate">
                {viewer?.story.profile?.apelido ?? viewer?.story.profile?.display_name ?? "Jogador"}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

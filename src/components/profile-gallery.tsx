import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ImagePlus, Heart, Trash2, Loader2 } from "lucide-react";
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
};

async function fetchPhotos(userId: string): Promise<PhotoRow[]> {
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("id, user_id, image_url, description, created_at, gallery_likes(user_id)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as PhotoRow[]) ?? [];
}


export function ProfileGallery() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [viewer, setViewer] = useState<PhotoRow | null>(null);

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

  const photosQ = useQuery({
    queryKey: ["gallery_photos"],
    queryFn: fetchPhotos,
    enabled: authChecked,
  });

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!file || !userId) throw new Error("Selecione uma imagem e faça login");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("gallery")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("gallery_photos").insert({
        user_id: userId,
        image_url: path,
        description: description.trim() || null,
      });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      toast.success("Foto publicada!");
      setOpen(false);
      setFile(null);
      setDescription("");
      qc.invalidateQueries({ queryKey: ["gallery_photos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const likeMut = useMutation({
    mutationFn: async ({ photoId, liked }: { photoId: string; liked: boolean }) => {
      if (!userId) throw new Error("Entre para curtir");
      if (liked) {
        const { error } = await supabase
          .from("gallery_likes")
          .delete()
          .eq("photo_id", photoId)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("gallery_likes")
          .insert({ photo_id: photoId, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gallery_photos"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (photo: PhotoRow) => {
      await supabase.storage.from("gallery").remove([photo.image_url]);
      const { error } = await supabase.from("gallery_photos").delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Foto removida");
      setViewer(null);
      qc.invalidateQueries({ queryKey: ["gallery_photos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!authChecked) return null;
  if (!userId) {
    return (
      <Card className="p-5 shadow-card">
        <h2 className="text-lg mb-2">Galeria</h2>
        <p className="text-sm text-muted-foreground">Entre para publicar fotos e curtir.</p>
      </Card>
    );
  }

  const photos = photosQ.data ?? [];

  return (
    <Card className="p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg">Galeria</h2>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          <ImagePlus className="size-4 mr-1.5" /> Nova foto
        </Button>
      </div>

      {photosQ.isLoading ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : photos.length === 0 ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex flex-col items-center justify-center gap-2 py-10 rounded-lg border-2 border-dashed border-border text-muted-foreground text-sm hover:bg-secondary/40 transition"
        >
          <ImagePlus className="size-8 opacity-60" />
          Clique para adicionar suas fotos
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p) => (
            <PhotoCard
              key={p.id}
              photo={p}
              userId={userId}
              onOpen={() => setViewer(p)}
              onLike={(liked) => likeMut.mutate({ photoId: p.id, liked })}
            />
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setFile(null);
            setDescription("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova foto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="g-file">Imagem</Label>
              <input
                id="g-file"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-secondary file:text-foreground file:text-xs file:font-semibold"
              />
            </div>
            {preview && (
              <img
                src={preview}
                alt="preview"
                className="w-full max-h-64 object-cover rounded-lg"
              />
            )}
            <div className="space-y-1.5">
              <Label htmlFor="g-desc">Descrição</Label>
              <Textarea
                id="g-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Conte sobre essa foto..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => uploadMut.mutate()} disabled={!file || uploadMut.isPending}>
              {uploadMut.isPending && <Loader2 className="size-4 mr-1.5 animate-spin" />}Publicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewer} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="max-w-2xl">
          {viewer && (
            <div className="space-y-3">
              <SignedImg
                path={viewer.image_url}
                className="w-full max-h-[60vh] object-contain rounded"
              />
              {viewer.description && <p className="text-sm">{viewer.description}</p>}
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {new Date(viewer.created_at).toLocaleString("pt-BR")}
                </div>
                {viewer.user_id === userId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMut.mutate(viewer)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4 mr-1.5" /> Remover
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PhotoCard({
  photo,
  userId,
  onOpen,
  onLike,
}: {
  photo: PhotoRow;
  userId: string;
  onOpen: () => void;
  onLike: (liked: boolean) => void;
}) {
  const likes = photo.gallery_likes ?? [];
  const liked = likes.some((l) => l.user_id === userId);
  return (
    <div className="rounded-xl overflow-hidden bg-secondary/40 border border-border/60 flex flex-col">
      <button type="button" onClick={onOpen} className="aspect-square overflow-hidden group">
        <SignedImg
          path={photo.image_url}
          className="w-full h-full object-cover transition group-hover:scale-105"
        />
      </button>
      <div className="p-3 space-y-2">
        {photo.description && <p className="text-xs line-clamp-2">{photo.description}</p>}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onLike(liked)}
            className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1 transition",
              liked
                ? "bg-destructive/15 text-destructive"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            <Heart className={cn("size-3.5", liked && "fill-current")} /> {likes.length}
          </button>
          <Avatar className="size-6 ml-auto">
            <AvatarFallback className="text-[10px]">
              {photo.user_id === userId ? "EU" : "?"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
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
  if (!data) return <div className={cn("bg-secondary animate-pulse", className)} />;
  return <img src={data} alt="" className={className} />;
}

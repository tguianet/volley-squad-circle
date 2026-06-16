import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const BANNER_W = 1600;
const BANNER_H = 600; // ~8:3 aspect to match the taller header

async function fetchBanner(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("banner_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.banner_url as string | null) ?? null;
}

function SignedBanner({ path, preview }: { path: string; preview?: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.storage
      .from("banners")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (alive) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      alive = false;
    };
  }, [path]);
  const src = url ?? preview ?? null;
  if (!src) return null;
  return (
    <img src={src} alt="Capa do perfil" className="absolute inset-0 w-full h-full object-cover" />
  );
}

async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const img = new Image();
  img.src = src;
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Falha ao carregar imagem"));
  });
  const canvas = document.createElement("canvas");
  canvas.width = BANNER_W;
  canvas.height = BANNER_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, BANNER_W, BANNER_H);
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, BANNER_W, BANNER_H);
  return await new Promise<Blob>((res, rej) => {
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao gerar imagem"))), "image/jpeg", 0.9);
  });
}

export function ProfileBanner() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [cropOpen, setCropOpen] = useState(false);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setUserId(s?.user?.id ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const bannerQ = useQuery({
    queryKey: ["profile_banner", userId],
    queryFn: () => fetchBanner(userId!),
    enabled: !!userId && authChecked,
  });

  const onCropComplete = useCallback((_: Area, pixels: Area) => setAreaPx(pixels), []);

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Faça login para alterar a capa");
      if (!srcUrl) throw new Error("Selecione uma imagem");
      if (!areaPx) throw new Error("Aguarde a imagem carregar e tente novamente");
      const blob = await cropToBlob(srcUrl, areaPx);
      const localPreview = URL.createObjectURL(blob);
      const path = `${userId}/banner-${Date.now()}.jpg`;

      // Optimistic preview — show cropped image instantly
      const old = bannerQ.data;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(localPreview);
      qc.setQueryData(["profile_banner", userId], path);
      closeCropper();
      toast.success("Capa atualizada");

      const { error: upErr } = await supabase.storage.from("banners").upload(path, blob, {
        upsert: true,
        contentType: "image/jpeg",
      });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ banner_url: path })
        .eq("id", userId)
        .select("banner_url")
        .single();
      if (dbErr) {
        await supabase.storage
          .from("banners")
          .remove([path])
          .catch(() => {});
        throw dbErr;
      }

      if (old && old !== path)
        await supabase.storage
          .from("banners")
          .remove([old])
          .catch(() => {});
      return path;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile_banner", userId] });
    },
    onError: (e: unknown) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      qc.invalidateQueries({ queryKey: ["profile_banner", userId] });
      toast.error(e instanceof Error ? e.message : "Falha ao enviar");
    },
  });

  const removeMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sem sessão");
      const current = bannerQ.data;
      if (current)
        await supabase.storage
          .from("banners")
          .remove([current])
          .catch(() => {});
      const { error } = await supabase
        .from("profiles")
        .update({ banner_url: null })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile_banner", userId] });
      toast.success("Capa removida");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao remover"),
  });

  const closeCropper = () => {
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    setSrcUrl(null);
    setAreaPx(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropOpen(false);
  };

  const onFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    setAreaPx(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setSrcUrl(URL.createObjectURL(f));
    setCropOpen(true);
  };

  const isLoading = uploadMut.isPending || removeMut.isPending;

  return (
    <div className="h-64 md:h-72 gradient-ocean relative overflow-hidden">
      {bannerQ.data && <SignedBanner path={bannerQ.data} preview={previewUrl} />}
      <div className="absolute top-3 left-3 flex gap-2 z-10">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            if (!userId) {
              toast.error("Faça login para alterar a capa");
              return;
            }
            fileRef.current?.click();
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="size-4 mr-1 animate-spin" />
          ) : (
            <ImagePlus className="size-4 mr-1" />
          )}
          {bannerQ.data ? "Trocar capa" : "Adicionar capa"}
        </Button>
        {bannerQ.data && userId && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => removeMut.mutate()}
            disabled={isLoading}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      <Dialog open={cropOpen} onOpenChange={(o) => (o ? setCropOpen(true) : closeCropper())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajustar capa</DialogTitle>
            <DialogDescription>Reposicione a imagem para encaixar no banner.</DialogDescription>
          </DialogHeader>
          <div
            className="relative w-full bg-muted rounded-md overflow-hidden"
            style={{ height: 320 }}
          >
            {srcUrl && (
              <Cropper
                image={srcUrl}
                crop={crop}
                zoom={zoom}
                aspect={BANNER_W / BANNER_H}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
              />
            )}
          </div>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Zoom</div>
            <Slider
              value={[zoom]}
              min={1}
              max={4}
              step={0.05}
              onValueChange={(v) => setZoom(v[0])}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCropper} disabled={uploadMut.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => uploadMut.mutate()} disabled={uploadMut.isPending}>
              {uploadMut.isPending ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
              Salvar capa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

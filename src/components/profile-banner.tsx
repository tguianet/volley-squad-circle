import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

async function fetchBanner(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("banner_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.banner_url as string | null) ?? null;
}

function SignedBanner({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.storage.from("banners").createSignedUrl(path, 3600).then(({ data }) => {
      if (alive) setUrl(data?.signedUrl ?? null);
    });
    return () => { alive = false; };
  }, [path]);
  if (!url) return null;
  return <img src={url} alt="Capa do perfil" className="absolute inset-0 w-full h-full object-cover" />;
}

export function ProfileBanner() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const bannerQ = useQuery({
    queryKey: ["profile_banner", userId],
    queryFn: () => fetchBanner(userId!),
    enabled: !!userId && authChecked,
  });

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      if (!userId) throw new Error("Faça login para alterar a capa");
      if (!file.type.startsWith("image/")) throw new Error("Selecione uma imagem");
      if (file.size > 8 * 1024 * 1024) throw new Error("Imagem deve ter até 8 MB");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/banner-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("banners").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      // remove old banner
      const old = bannerQ.data;
      if (old && old !== path) {
        await supabase.storage.from("banners").remove([old]).catch(() => {});
      }
      const { error: dbErr } = await supabase.from("profiles").update({ banner_url: path }).eq("id", userId);
      if (dbErr) throw dbErr;
      return path;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile_banner", userId] });
      toast.success("Capa atualizada");
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao enviar"),
  });

  const removeMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sem sessão");
      const current = bannerQ.data;
      if (current) await supabase.storage.from("banners").remove([current]).catch(() => {});
      const { error } = await supabase.from("profiles").update({ banner_url: null }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile_banner", userId] });
      toast.success("Capa removida");
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao remover"),
  });

  const isLoading = uploadMut.isPending || removeMut.isPending;

  return (
    <div className="h-32 gradient-ocean relative overflow-hidden">
      {bannerQ.data && <SignedBanner path={bannerQ.data} />}
      <div className="absolute top-3 left-3 flex gap-2 z-10">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadMut.mutate(f);
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
          {isLoading ? <Loader2 className="size-4 mr-1 animate-spin" /> : <ImagePlus className="size-4 mr-1" />}
          {bannerQ.data ? "Trocar capa" : "Adicionar capa"}
        </Button>
        {bannerQ.data && userId && (
          <Button size="sm" variant="destructive" onClick={() => removeMut.mutate()} disabled={isLoading}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

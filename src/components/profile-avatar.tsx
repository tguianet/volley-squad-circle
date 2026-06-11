import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

async function fetchAvatar(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.avatar_url as string | null) ?? null;
}

function SignedAvatar({ path, preview, fallback }: { path: string | null; preview?: string | null; fallback: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!path) { setUrl(null); return; }
    supabase.storage.from("avatars").createSignedUrl(path, 3600).then(({ data }) => {
      if (alive) setUrl(data?.signedUrl ?? null);
    });
    return () => { alive = false; };
  }, [path]);
  const src = url ?? preview ?? undefined;
  return (
    <>
      {src ? <AvatarImage src={src} /> : null}
      <AvatarFallback>{fallback}</AvatarFallback>
    </>
  );
}

export function ProfileAvatar({ fallback, className, editable = false }: { fallback: string; className?: string; editable?: boolean }) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const avatarQ = useQuery({
    queryKey: ["profile-avatar", userId],
    queryFn: () => fetchAvatar(userId!),
    enabled: !!userId,
  });

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      if (!userId) throw new Error("Faça login");
      if (!file.type.startsWith("image/")) throw new Error("Selecione uma imagem");
      if (file.size > 5 * 1024 * 1024) throw new Error("Máximo 5MB");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const local = URL.createObjectURL(file);
      setPreviewUrl(local);
      qc.setQueryData(["profile-avatar", userId], path);

      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;

      const old = avatarQ.data;
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", userId);
      if (dbErr) {
        await supabase.storage.from("avatars").remove([path]);
        throw dbErr;
      }
      if (old && old !== path) {
        await supabase.storage.from("avatars").remove([old]);
      }
      return path;
    },
    onSuccess: () => {
      toast.success("Foto atualizada");
      qc.invalidateQueries({ queryKey: ["profile-avatar", userId] });
    },
    onError: (e: any) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      qc.invalidateQueries({ queryKey: ["profile-avatar", userId] });
      toast.error(e?.message || "Falha ao enviar");
    },
  });

  const removeMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Faça login");
      const old = avatarQ.data;
      if (old) await supabase.storage.from("avatars").remove([old]);
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      setPreviewUrl(null);
      toast.success("Foto removida");
      qc.invalidateQueries({ queryKey: ["profile-avatar", userId] });
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao remover"),
  });

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) uploadMut.mutate(file);
  };

  if (!editable) {
    return (
      <Avatar className={className}>
        <SignedAvatar path={avatarQ.data ?? null} preview={previewUrl} fallback={fallback} />
      </Avatar>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className={className}>
        <SignedAvatar path={avatarQ.data ?? null} preview={previewUrl} fallback={fallback} />
      </Avatar>
      <div className="flex flex-col gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          disabled={uploadMut.isPending}
        >
          {uploadMut.isPending ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Camera className="size-4 mr-1" />}
          {avatarQ.data ? "Trocar foto" : "Enviar foto"}
        </Button>
        {avatarQ.data && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => removeMut.mutate()}
            disabled={removeMut.isPending}
          >
            <Trash2 className="size-4 mr-1" /> Remover
          </Button>
        )}
      </div>
    </div>
  );
}

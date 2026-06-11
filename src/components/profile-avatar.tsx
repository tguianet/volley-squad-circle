import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, Loader2, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Diag = { step: string; message: string; details?: unknown };

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
  const [diag, setDiag] = useState<Diag | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const avatarQ = useQuery({
    queryKey: ["profile-avatar", userId],
    queryFn: () => fetchAvatar(userId!),
    enabled: !!userId,
  });

  const reportError = (step: string, message: string, details?: unknown) => {
    console.error(`[avatar] ${step}:`, message, details ?? "");
    setDiag({ step, message, details });
    toast.error(`${step}: ${message}`);
  };

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      setDiag(null);

      console.info("[avatar] step: auth");
      const { data: u, error: authErr } = await supabase.auth.getUser();
      if (authErr || !u.user) {
        throw { step: "Autenticação", message: "Você precisa estar logado para enviar a foto.", details: authErr };
      }
      const uid = u.user.id;
      console.info("[avatar] auth ok", uid);

      console.info("[avatar] step: validar arquivo", { name: file.name, type: file.type, size: file.size });
      if (!file.type.startsWith("image/")) {
        throw { step: "Validação", message: "Selecione uma imagem (jpg, png, webp).", details: { type: file.type } };
      }
      if (file.size > 5 * 1024 * 1024) {
        throw { step: "Validação", message: `Tamanho ${(file.size / 1024 / 1024).toFixed(2)}MB excede o limite de 5MB.` };
      }

      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${uid}/avatar-${Date.now()}.${ext}`;
      const local = URL.createObjectURL(file);
      setPreviewUrl(local);

      console.info("[avatar] step: upload ->", path);
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });
      if (upErr) {
        const m = upErr.message || "";
        const msg = /bucket/i.test(m)
          ? "Bucket 'avatars' inacessível."
          : /policy|permission|unauthorized|403/i.test(m)
          ? "Permissão negada pelo Storage (RLS). Verifique as políticas do bucket 'avatars'."
          : m;
        throw { step: "Upload no Storage", message: msg, details: upErr };
      }
      console.info("[avatar] upload ok");

      console.info("[avatar] step: atualizar profile");
      const old = avatarQ.data;
      const { error: dbErr } = await supabase
        .from("profiles")
        .upsert({ id: uid, avatar_url: path }, { onConflict: "id" });
      if (dbErr) {
        await supabase.storage.from("avatars").remove([path]).catch(() => {});
        const m = dbErr.message || "";
        const msg = /policy|permission|row-level/i.test(m)
          ? "Permissão negada na tabela 'profiles' (RLS)."
          : m;
        throw { step: "Atualizar perfil", message: msg, details: dbErr };
      }
      console.info("[avatar] profile updated");

      if (old && old !== path) {
        await supabase.storage.from("avatars").remove([old]).catch((e) => {
          console.warn("[avatar] não foi possível remover a antiga", e);
        });
      }

      qc.setQueryData(["profile-avatar", uid], path);
      return path;
    },
    onSuccess: () => {
      setDiag(null);
      toast.success("Foto atualizada");
      qc.invalidateQueries({ queryKey: ["profile-avatar", userId] });
    },
    onError: (e: any) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      qc.invalidateQueries({ queryKey: ["profile-avatar", userId] });
      if (e && typeof e === "object" && "step" in e) {
        reportError(e.step, e.message, e.details);
      } else {
        reportError("Erro inesperado", e?.message || String(e), e);
      }
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
      setDiag(null);
      toast.success("Foto removida");
      qc.invalidateQueries({ queryKey: ["profile-avatar", userId] });
    },
    onError: (e: any) => reportError("Remover foto", e?.message || "Falha ao remover", e),
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
    <div className="flex flex-col gap-3">
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
      {diag && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Falha em: {diag.step}</AlertTitle>
          <AlertDescription className="text-xs">
            {diag.message}
            <div className="mt-1 opacity-70">Abra o console (F12) para ver detalhes técnicos.</div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

type ProfileRow = {
  id: string;
  display_name: string | null;
  apelido: string | null;
  city: string | null;
  state: string | null;
  whatsapp: string | null;
  posicao_principal: string | null;
  level: string | null;
  mao_dominante: string | null;
  avatar_url: string | null;
  data_nascimento: string | null;
  altura: number | null;
  observacoes: string | null;
  bio: string | null;
  instagram: string | null;
  status: string;
};

async function fetchMyProfile(): Promise<ProfileRow | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, apelido, city, state, whatsapp, posicao_principal, level, mao_dominante, avatar_url, data_nascimento, altura, observacoes, bio, instagram, status")
    .eq("id", u.user.id)
    .maybeSingle();
  if (error) throw error;
  return data as ProfileRow | null;
}

function normalizeAltura(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const raw = Number(trimmed);
  if (!Number.isFinite(raw) || raw <= 0) throw new Error("Informe uma altura válida.");
  const meters = raw > 10 ? raw / 100 : raw;
  if (meters < 1 || meters > 2.5) throw new Error("Informe a altura em metros ou centímetros. Ex: 1,67 ou 167.");
  return Number(meters.toFixed(2));
}

export function ProfileCompletionModal() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: fetchMyProfile });

  const [form, setForm] = useState({
    apelido: "",
    city: "",
    state: "",
    whatsapp: "",
    posicao_principal: "",
    level: "",
    mao_dominante: "",
    avatar_url: "",
    data_nascimento: "",
    altura: "",
    observacoes: "",
    bio: "",
    instagram: "",
  });
  const [saving, setSaving] = useState(false);
  const [forceClosed, setForceClosed] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        apelido: profile.apelido ?? "",
        city: profile.city ?? "",
        state: profile.state ?? "",
        whatsapp: profile.whatsapp ?? "",
        posicao_principal: profile.posicao_principal ?? "",
        level: profile.level ?? "",
        mao_dominante: profile.mao_dominante ?? "",
        avatar_url: profile.avatar_url ?? "",
        data_nascimento: profile.data_nascimento ?? "",
        altura: profile.altura ? String(profile.altura) : "",
        observacoes: profile.observacoes ?? "",
        bio: profile.bio ?? "",
        instagram: profile.instagram ?? "",
      });
      if (profile.status !== "completo") setForceClosed(false);
    }
  }, [profile]);

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<string | null>(null);
  const [signedPreview, setSignedPreview] = useState<string | null>(null);

  // Generate signed URL for storage paths (not full http URLs)
  useEffect(() => {
    const v = form.avatar_url;
    if (!v || v.startsWith("http") || v.startsWith("blob:")) { setSignedPreview(null); return; }
    let alive = true;
    supabase.storage.from("avatars").createSignedUrl(v, 3600).then(({ data }) => {
      if (alive) setSignedPreview(data?.signedUrl ?? null);
    });
    return () => { alive = false; };
  }, [form.avatar_url]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 5MB."); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      setPreviewBlob(URL.createObjectURL(file));
      setForm((f) => ({ ...f, avatar_url: path }));
      toast.success("Foto enviada!");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  const avatarSrc = previewBlob ?? signedPreview ?? (form.avatar_url?.startsWith("http") ? form.avatar_url : null);

  const open = !!profile && profile.status !== "completo" && !forceClosed;

  const requiredOk =
    form.apelido.trim() &&
    form.city.trim() &&
    form.state.trim() &&
    form.whatsapp.trim() &&
    form.posicao_principal &&
    form.level &&
    form.mao_dominante;

  const onSave = async () => {
    if (!requiredOk || !profile) return;
    setSaving(true);
    try {
      const payload = {
        apelido: form.apelido.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        whatsapp: form.whatsapp.trim(),
        posicao_principal: form.posicao_principal,
        level: form.level,
        mao_dominante: form.mao_dominante,
        avatar_url: form.avatar_url || null,
        data_nascimento: form.data_nascimento || null,
        altura: normalizeAltura(form.altura),
        observacoes: form.observacoes.trim() || null,
        bio: form.bio.trim() || null,
        instagram: form.instagram.trim() || null,
        status: "completo",
      };
      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", profile.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Nenhuma linha foi atualizada. Verifique permissões.");
      qc.setQueryData(["my-profile"], (prev: any) => prev ? { ...prev, ...payload } : prev);
      toast.success("Perfil completo! Bem-vindo à areia.");
      setForceClosed(true);
      await qc.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Complete seu perfil <span className="text-primary">PlayBeach</span></DialogTitle>
          <DialogDescription>
            Para entrar no ranking PlayBeach e desafiar outros jogadores, preencha as informações abaixo.
            {profile?.display_name && <span className="block mt-1 text-xs">Olá, <b>{profile.display_name}</b> — seu nome do Google será usado no ranking.</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Apelido / @username *">
              <Input value={form.apelido} onChange={(e) => setForm({ ...form, apelido: e.target.value })} maxLength={30} placeholder="@seuapelido" />
            </Field>
            <Field label="Cidade *">
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={60} />
            </Field>
            <Field label="Estado *">
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} maxLength={2} placeholder="SP" />
            </Field>
            <Field label="WhatsApp *">
              <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} maxLength={20} placeholder="(11) 9 9999-9999" />
            </Field>
            <Field label="Posição principal *">
              <Select value={form.posicao_principal} onValueChange={(v) => setForm({ ...form, posicao_principal: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Atacante">Atacante</SelectItem>
                  <SelectItem value="Defensor">Defensor</SelectItem>
                  <SelectItem value="Levantador">Levantador</SelectItem>
                  <SelectItem value="Universal">Universal</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nível *">
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Iniciante">Iniciante</SelectItem>
                  <SelectItem value="Intermediário">Intermediário</SelectItem>
                  <SelectItem value="Avançado">Avançado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Mão dominante *">
              <Select value={form.mao_dominante} onValueChange={(v) => setForm({ ...form, mao_dominante: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Direita">Direita</SelectItem>
                  <SelectItem value="Esquerda">Esquerda</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="border-t pt-3 space-y-3">
            <p className="text-xs text-muted-foreground">Opcionais</p>

            <Field label="Foto de perfil">
              <div className="flex items-center gap-3">
                <Avatar className="size-16">
                  {avatarSrc ? <AvatarImage src={avatarSrc} /> : null}
                  <AvatarFallback>{(form.apelido || profile?.display_name || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Upload className="size-4 mr-2" />}
                  {uploading ? "Enviando..." : "Enviar foto"}
                </Button>
              </div>
            </Field>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Data de nascimento">
                <Input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
              </Field>
              <Field label="Altura">
                <Input type="number" step="0.01" min="1" max="250" value={form.altura} onChange={(e) => setForm({ ...form, altura: e.target.value })} placeholder="1.80 ou 180" />
              </Field>
              <Field label="Instagram">
                <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} maxLength={40} placeholder="@seuinstagram" />
              </Field>
              <Field label="Bio / frase do perfil">
                <Input value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={120} placeholder="Vamo pra areia!" />
              </Field>
              <Field label="Observações">
                <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} maxLength={300} rows={2} />
              </Field>
            </div>
          </div>

          <Button onClick={onSave} disabled={!requiredOk || saving} className="w-full">
            {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
            Salvar Perfil
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

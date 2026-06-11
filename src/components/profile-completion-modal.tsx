import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  status: string;
};

async function fetchMyProfile(): Promise<ProfileRow | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, apelido, city, state, whatsapp, posicao_principal, level, mao_dominante, avatar_url, data_nascimento, altura, observacoes, status")
    .eq("id", u.user.id)
    .maybeSingle();
  if (error) throw error;
  return data as ProfileRow | null;
}

export function ProfileCompletionModal() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: fetchMyProfile });

  const [form, setForm] = useState({
    display_name: "",
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
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? "",
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
      });
    }
  }, [profile]);

  const open = !!profile && profile.status !== "completo";

  const requiredOk =
    form.display_name.trim() &&
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
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: form.display_name.trim(),
          apelido: form.apelido.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          whatsapp: form.whatsapp.trim(),
          posicao_principal: form.posicao_principal,
          level: form.level,
          mao_dominante: form.mao_dominante,
          avatar_url: form.avatar_url || null,
          data_nascimento: form.data_nascimento || null,
          altura: form.altura ? Number(form.altura) : null,
          observacoes: form.observacoes || null,
          status: "completo",
        })
        .eq("id", profile.id);
      if (error) throw error;
      toast.success("Perfil completo! Bem-vindo à areia.");
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
          <DialogTitle>Complete seu perfil</DialogTitle>
          <DialogDescription>
            Para entrar no ranking e desafiar outros jogadores, preencha as informações abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nome no ranking *">
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} maxLength={60} />
            </Field>
            <Field label="Apelido *">
              <Input value={form.apelido} onChange={(e) => setForm({ ...form, apelido: e.target.value })} maxLength={30} />
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

          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">Opcionais</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Foto (URL)">
                <Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." />
              </Field>
              <Field label="Data de nascimento">
                <Input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
              </Field>
              <Field label="Altura (m)">
                <Input type="number" step="0.01" min="1" max="2.5" value={form.altura} onChange={(e) => setForm({ ...form, altura: e.target.value })} placeholder="1.80" />
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

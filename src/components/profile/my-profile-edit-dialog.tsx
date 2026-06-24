import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProfileAvatar } from "@/components/profile-avatar";
import { getErrorMessage } from "@/lib/utils";

export type MyProfileFormData = {
  id: string;
  display_name: string | null;
  apelido: string | null;
  username: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  whatsapp: string | null;
  instagram: string | null;
  posicao_principal: string | null;
  level: string | null;
  mao_dominante: string | null;
  altura: number | null;
  genero: string | null;
  arena_id: string | null;
  arena_name: string | null;
};

function normalizeAltura(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const raw = Number(trimmed);
  if (!Number.isFinite(raw) || raw <= 0) throw new Error("Informe uma altura válida.");
  const meters = raw > 10 ? raw / 100 : raw;
  if (meters < 1 || meters > 2.5)
    throw new Error("Informe a altura em metros ou centímetros. Ex: 1,67 ou 167.");
  return Number(meters.toFixed(2));
}

type MyProfileEditDialogProps = {
  profile: MyProfileFormData;
  displayName: string;
  fallbackInitial: string;
};

export function MyProfileEditDialog({
  profile,
  displayName,
  fallbackInitial,
}: MyProfileEditDialogProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    apelido: "",
    bio: "",
    city: "",
    state: "",
    whatsapp: "",
    instagram: "",
    posicao_principal: "",
    level: "",
    mao_dominante: "",
    altura: "",
    genero: "",
    arena_id: "",
  });

  const arenasQ = useQuery({
    queryKey: ["arenas-active-edit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("arenas")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      apelido: profile.apelido ?? profile.username ?? "",
      bio: profile.bio ?? "",
      city: profile.city ?? "",
      state: profile.state ?? "",
      whatsapp: profile.whatsapp ?? "",
      instagram: profile.instagram ?? "",
      posicao_principal: profile.posicao_principal ?? "",
      level: profile.level ?? "",
      mao_dominante: profile.mao_dominante ?? "",
      altura: profile.altura ? String(profile.altura) : "",
      genero: profile.genero ?? "",
      arena_id: profile.arena_id ?? "",
    });
  }, [open, profile]);

  const onSave = async () => {
    setSaving(true);
    try {
      const isProfileComplete =
        form.apelido.trim() &&
        form.city.trim() &&
        form.state.trim() &&
        form.whatsapp.trim() &&
        form.posicao_principal &&
        form.level &&
        form.mao_dominante &&
        form.genero;

      const selectedArena = (arenasQ.data ?? []).find((a) => a.id === form.arena_id);

      const payload = {
        apelido: form.apelido.trim() || null,
        bio: form.bio.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        instagram: form.instagram.trim() || null,
        posicao_principal: form.posicao_principal || null,
        level: form.level || null,
        mao_dominante: form.mao_dominante || null,
        altura: normalizeAltura(form.altura),
        genero: form.genero || null,
        arena_id: form.arena_id || null,
        status: isProfileComplete ? "completo" : undefined,
      };

      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", profile.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Nenhuma linha foi atualizada. Verifique permissões.");

      qc.setQueryData(["my-profile"], (prev: MyProfileFormData | undefined) =>
        prev
          ? {
              ...prev,
              ...payload,
              arena_name: selectedArena?.name ?? null,
            }
          : prev,
      );
      toast.success("Perfil atualizado");
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["my-profile"] });
      await qc.invalidateQueries({ queryKey: ["ranking-individual-rows"] });
      await qc.invalidateQueries({ queryKey: ["ranking-team-rows"] });
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Erro ao salvar"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="shrink-0 gap-1.5">
          <Settings className="size-4" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar perfil <span className="text-primary">PlayBeach</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Foto do perfil</Label>
            <ProfileAvatar fallback={fallbackInitial} className="size-20" editable />
          </div>
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={displayName} disabled readOnly />
            <p className="text-[11px] text-muted-foreground">Nome vindo da sua conta Google.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Apelido / @username</Label>
              <Input
                value={form.apelido}
                onChange={(e) => setForm({ ...form, apelido: e.target.value })}
                maxLength={30}
              />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                maxLength={2}
                placeholder="SP"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Altura</Label>
              <Input
                type="number"
                step="0.01"
                value={form.altura}
                onChange={(e) => setForm({ ...form, altura: e.target.value })}
                placeholder="1.80 ou 180"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Instagram</Label>
              <Input
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                placeholder="@seuinsta"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Posição</Label>
              <Select
                value={form.posicao_principal}
                onValueChange={(v) => setForm({ ...form, posicao_principal: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Atacante">Atacante</SelectItem>
                  <SelectItem value="Defensor">Defensor</SelectItem>
                  <SelectItem value="Levantador">Levantador</SelectItem>
                  <SelectItem value="Universal">Universal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nível</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Iniciante">Iniciante</SelectItem>
                  <SelectItem value="Intermediário">Intermediário</SelectItem>
                  <SelectItem value="Avançado">Avançado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mão dominante</Label>
              <Select
                value={form.mao_dominante}
                onValueChange={(v) => setForm({ ...form, mao_dominante: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Direita">Direita</SelectItem>
                  <SelectItem value="Esquerda">Esquerda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Gênero</Label>
              <Select value={form.genero} onValueChange={(v) => setForm({ ...form, genero: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Arena principal</Label>
              <Select
                value={form.arena_id || "__none__"}
                onValueChange={(v) =>
                  setForm({ ...form, arena_id: v === "__none__" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma arena" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {(arenasQ.data ?? []).map((arena) => (
                    <SelectItem key={arena.id} value={arena.id}>
                      {arena.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Bio</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              maxLength={200}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

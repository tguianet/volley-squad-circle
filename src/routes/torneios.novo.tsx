import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { createTournament } from "@/lib/tournament.queries";
import type { TournamentFormat, TournamentStatus } from "@/lib/tournament.types";
import { useCurrentUser } from "@/hooks/use-auth";
import { getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/torneios/novo")({
  head: () => ({ meta: [{ title: "Criar torneio | PLAYBEACH" }] }),
  component: NewTournamentPage,
});

const CATEGORY_PRESETS = [
  "Dupla Masculina — Cat. A",
  "Dupla Masculina — Cat. B",
  "Dupla Feminina — Cat. A",
  "Dupla Feminina — Cat. B",
  "Quarteto Misto — Open",
  "Misto Amador",
];

const FORMAT_OPTIONS: { value: TournamentFormat; label: string }[] = [
  { value: "ready_teams", label: "Times prontos" },
  { value: "team_draw", label: "Sorteio de times" },
];

const STATUS_OPTIONS: { value: TournamentStatus; label: string }[] = [
  { value: "open", label: "Inscrições abertas" },
  { value: "coming_soon", label: "Em breve" },
  { value: "featured", label: "Destaque" },
  { value: "last_spots", label: "Últimas vagas" },
];

function parseFeeToCents(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100);
}

function NewTournamentPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useCurrentUser();
  const [title, setTitle] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("");
  const [arenaId, setArenaId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [feeReais, setFeeReais] = useState("");
  const [maxTeams, setMaxTeams] = useState(16);
  const [format, setFormat] = useState<TournamentFormat>("ready_teams");
  const [status, setStatus] = useState<TournamentStatus>("open");
  const [isFeatured, setIsFeatured] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: arenas = [] } = useQuery({
    queryKey: ["arenas-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("arenas")
        .select("id, name, city")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (arenas.length === 1 && !arenaId) {
      setArenaId(arenas[0].id);
    }
  }, [arenas, arenaId]);

  useEffect(() => {
    async function loadDefaultArena() {
      if (arenaId || arenas.length > 0) return;
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "default_arena_id")
        .maybeSingle();
      if (data?.value) {
        const id =
          typeof data.value === "string"
            ? data.value.replace(/"/g, "")
            : String(data.value).replace(/"/g, "");
        setArenaId(id);
      }
    }
    loadDefaultArena();
  }, [arenaId, arenas.length]);

  async function handleCreate() {
    if (!user) {
      toast.error("Faça login para criar um torneio.");
      navigate({ to: "/auth" });
      return;
    }
    if (!title.trim()) {
      toast.error("Informe o nome do torneio.");
      return;
    }
    if (!categoryLabel.trim()) {
      toast.error("Informe a categoria.");
      return;
    }
    if (!eventDate) {
      toast.error("Informe a data do evento.");
      return;
    }
    if (!startTime) {
      toast.error("Informe o horário de início.");
      return;
    }
    if (maxTeams < 2) {
      toast.error("O torneio precisa de pelo menos 2 vagas.");
      return;
    }

    setSaving(true);
    try {
      const id = await createTournament({
        title: title.trim(),
        category_label: categoryLabel.trim(),
        arena_id: arenaId || null,
        event_date: eventDate,
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        entry_fee_cents: parseFeeToCents(feeReais),
        max_teams: maxTeams,
        format,
        status,
        is_featured: isFeatured,
        image_url: imageUrl.trim() || null,
        created_by: user.id,
      });
      toast.success("Torneio publicado!");
      navigate({ to: "/torneios/$id", params: { id } });
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Não foi possível criar o torneio."));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <AppLayout>
        <p className="text-center text-sm text-muted-foreground py-20">Carregando…</p>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
          <p className="text-muted-foreground">Faça login para publicar um torneio interno.</p>
          <Button asChild>
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="relative min-h-full tournament-page-bg">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-5">
          <Link
            to="/torneios"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="size-4" /> Voltar aos torneios
          </Link>

          <Card className="p-5 sm:p-6 challenge-panel overflow-hidden relative">
            <div className="absolute inset-0 gradient-sand opacity-40 pointer-events-none" />
            <div className="relative">
              <span className="coastal-pill bg-primary/10 text-primary border border-primary/20 text-[10px] mb-3 inline-block">
                Torneio interno
              </span>
              <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-primary">
                Criar torneio
              </h1>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Publique uma competição oficial da arena. As inscrições ficam disponíveis na listagem
                assim que o torneio for salvo.
              </p>
            </div>
          </Card>

          <Card className="p-5 sm:p-6 challenge-panel space-y-5">
            <div>
              <Label htmlFor="title">Nome do torneio</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Copa Verão PlayBeach"
                maxLength={120}
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                value={categoryLabel}
                onChange={(e) => setCategoryLabel(e.target.value)}
                placeholder="Ex: Dupla Masculina — Cat. A"
                maxLength={80}
                className="mt-1.5 rounded-xl"
                list="category-presets"
              />
              <datalist id="category-presets">
                {CATEGORY_PRESETS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <Label>Arena</Label>
              <Select value={arenaId} onValueChange={setArenaId}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Selecione uma arena (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {arenas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                      {a.city ? ` — ${a.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="time">Horário</Label>
                <Input
                  id="time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fee">Taxa de inscrição (R$)</Label>
                <Input
                  id="fee"
                  inputMode="decimal"
                  value={feeReais}
                  onChange={(e) => setFeeReais(e.target.value)}
                  placeholder="120,00 — deixe vazio se for grátis"
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="max">Vagas (times)</Label>
                <Input
                  id="max"
                  type="number"
                  min={2}
                  max={128}
                  value={maxTeams}
                  onChange={(e) => setMaxTeams(Number(e.target.value))}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Formato</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as TournamentFormat)}>
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status inicial</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TournamentStatus)}>
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="image">URL da imagem (opcional)</Label>
              <Input
                id="image"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Destacar na listagem</p>
                <p className="text-xs text-muted-foreground">Exibe badge de destaque no card</p>
              </div>
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
            </div>

            <Button
              variant="beach"
              className="w-full rounded-xl font-bold text-base py-6"
              onClick={handleCreate}
              disabled={saving}
            >
              {saving ? "Publicando…" : "Publicar torneio"}
            </Button>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

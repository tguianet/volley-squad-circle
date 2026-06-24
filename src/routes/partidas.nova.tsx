import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import { FriendlySchedulePicker } from "@/components/matches/friendly-schedule-picker";
import { checkCourtAvailability } from "@/lib/match-availability.queries";

type MatchModality = Database["public"]["Enums"]["match_modality"];
type MatchType = Database["public"]["Enums"]["match_type"];
type MatchStatus = Database["public"]["Enums"]["match_status"];

export const Route = createFileRoute("/partidas/nova")({
  head: () => ({ meta: [{ title: "Criar partida amistosa | PLAYBEACH" }] }),
  component: NewMatchPage,
});

const MODALITIES = [
  { v: "beach_volley", l: "Vôlei de praia" },
  { v: "indoor_volley", l: "Vôlei indoor" },
  { v: "futevolei", l: "Futevôlei" },
];
const TYPES = [
  { v: "dupla_m", l: "Dupla masculina", category: "dupla", max: 4 },
  { v: "dupla_f", l: "Dupla feminina", category: "dupla", max: 4 },
  { v: "dupla_x", l: "Dupla mista", category: "dupla", max: 4 },
  { v: "quarteto_m", l: "Quarteto masculino", category: "quarteto", max: 8 },
  { v: "quarteto_f", l: "Quarteto feminino", category: "quarteto", max: 8 },
  { v: "quarteto_x", l: "Quarteto misto", category: "quarteto", max: 8 },
];

function NewMatchPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [arenaId, setArenaId] = useState<string>("");
  const [modality, setModality] = useState("beach_volley");
  const [matchType, setMatchType] = useState("dupla_m");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [courtNumber, setCourtNumber] = useState<number | null>(null);
  const [courtName, setCourtName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [notes, setNotes] = useState("");
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

  function handleScheduleChange(value: {
    date?: string;
    startTime?: string;
    endTime?: string;
    courtNumber?: number;
    courtName?: string;
  }) {
    if (value.date !== undefined) {
      setDate(value.date);
      if (!value.startTime) {
        setStartTime("");
        setEndTime("");
        setCourtNumber(null);
        setCourtName("");
      }
    }
    if (value.startTime !== undefined) {
      setStartTime(value.startTime);
      if (!value.courtNumber) {
        setCourtNumber(null);
        setCourtName("");
      }
    }
    if (value.endTime !== undefined) setEndTime(value.endTime);
    if (value.courtNumber !== undefined) {
      setCourtNumber(value.courtNumber && value.courtNumber > 0 ? value.courtNumber : null);
    }
    if (value.courtName !== undefined) setCourtName(value.courtName);
  }

  function handleArenaChange(value: string) {
    setArenaId(value);
    setDate("");
    setStartTime("");
    setEndTime("");
    setCourtNumber(null);
    setCourtName("");
  }

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("Informe o título da partida.");
      return;
    }
    if (!arenaId) {
      toast.error("Selecione uma arena.");
      return;
    }
    if (!date || !startTime || !endTime) {
      toast.error("Escolha domingo, horário e quadra na agenda.");
      return;
    }
    if (!courtNumber) {
      toast.error("Escolha uma quadra disponível.");
      return;
    }

    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.error("Faça login.");
        return;
      }

      const stillAvailable = await checkCourtAvailability(
        date,
        startTime,
        endTime,
        arenaId,
        courtNumber,
      );
      if (!stillAvailable) {
        toast.error("Essa quadra acabou de ser reservada. Escolha outro horário.");
        setDate("");
        setStartTime("");
        setEndTime("");
        setCourtNumber(null);
        setCourtName("");
        return;
      }

      const typeEntry = TYPES.find((t) => t.v === matchType);
      const category = (typeEntry?.category ?? "dupla") as MatchType;
      const genderLabel = typeEntry?.l ?? "";
      const composedNotes = [genderLabel ? `[${genderLabel}]` : "", notes.trim()]
        .filter(Boolean)
        .join(" ")
        .trim();

      const insertRow: Database["public"]["Tables"]["matches"]["Insert"] = {
        creator_id: u.user.id,
        arena_id: arenaId,
        court_number: courtNumber,
        title: title.trim(),
        modality: modality as MatchModality,
        match_type: category,
        date,
        start_time: startTime,
        end_time: endTime,
        max_players: maxPlayers,
        notes: composedNotes || null,
        status: "open" satisfies MatchStatus,
      };

      const { error } = await supabase.from("matches").insert(insertRow);
      if (error) throw error;
      toast.success("Partida amistosa criada!");
      navigate({ to: "/partidas" });
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Erro ao criar partida"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="relative min-h-full">
        <div className="fixed inset-0 pointer-events-none -z-10 opacity-30">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-5">
          <Link
            to="/partidas"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="size-4" /> Voltar às partidas
          </Link>

          <Card className="p-5 sm:p-6 challenge-panel overflow-hidden relative">
            <div className="absolute inset-0 gradient-sand opacity-40 pointer-events-none" />
            <div className="relative">
              <span className="coastal-pill bg-primary/10 text-primary border border-primary/20 text-[10px] mb-3 inline-block">
                Partida amistosa
              </span>
              <h1 className="page-title text-2xl sm:text-3xl">Criar partida</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Use a mesma agenda de domingos do ranking. Não altera posições — apenas diversão na
                areia.
              </p>
            </div>
          </Card>

          <Card className="p-5 sm:p-6 challenge-panel space-y-5">
            <div>
              <Label>Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Treino de domingo"
                maxLength={100}
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <Label>Arena</Label>
              <Select value={arenaId} onValueChange={handleArenaChange}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Selecione uma arena" />
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Modalidade</Label>
                <Select value={modality} onValueChange={setModality}>
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODALITIES.map((m) => (
                      <SelectItem key={m.v} value={m.v}>
                        {m.l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={matchType}
                  onValueChange={(v) => {
                    setMatchType(v);
                    const t = TYPES.find((x) => x.v === v);
                    if (t) setMaxPlayers(t.max);
                  }}
                >
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t.v} value={t.v}>
                        {t.l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <FriendlySchedulePicker
              arenaId={arenaId}
              date={date}
              startTime={startTime}
              endTime={endTime}
              courtNumber={courtNumber}
              courtName={courtName}
              onChange={handleScheduleChange}
            />

            <div>
              <Label>Máximo de jogadores</Label>
              <Input
                type="number"
                min={2}
                max={20}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalhes adicionais (opcional)"
                maxLength={500}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <Button
              variant="beach"
              className="w-full rounded-xl font-bold text-base py-6"
              onClick={handleCreate}
              disabled={saving || !arenaId}
            >
              {saving ? "Criando…" : "Criar partida amistosa"}
            </Button>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

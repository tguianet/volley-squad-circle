import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import {
  CourtPickerModal,
  SchedulePickerButton,
  SundayPickerModal,
  TimeSlotPickerModal,
} from "@/components/match-availability-pickers";
import { checkCourtAvailability } from "@/lib/match-availability.queries";
import {
  formatDateBR,
  formatSundayLong,
  formatTimeSlotLabel,
  formatWeekdayBR,
} from "@/lib/date-format";

type MatchModality = Database["public"]["Enums"]["match_modality"];
type MatchType = Database["public"]["Enums"]["match_type"];
type MatchStatus = Database["public"]["Enums"]["match_status"];

export const Route = createFileRoute("/partidas/nova")({
  head: () => ({ meta: [{ title: "Criar partida — PlayBeach" }] }),
  component: NewMatchPage,
});

const MODALITIES = [
  { v: "beach_volley", l: "Vôlei de praia" },
  { v: "indoor_volley", l: "Vôlei indoor" },
  { v: "futevolei", l: "Futevôlei" },
];
const TYPES = [
  { v: "dupla", l: "Dupla", max: 4 },
  { v: "quarteto", l: "Quarteto", max: 8 },
  { v: "sexteto", l: "Sexteto", max: 12 },
];

function NewMatchPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [arenaId, setArenaId] = useState<string>("");
  const [modality, setModality] = useState("beach_volley");
  const [matchType, setMatchType] = useState("dupla");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [courtNumber, setCourtNumber] = useState<number | null>(null);
  const [courtLabel, setCourtLabel] = useState("");
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [sundayModalOpen, setSundayModalOpen] = useState(false);
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [courtModalOpen, setCourtModalOpen] = useState(false);

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

  function resetSchedule() {
    setDate("");
    setStartTime("");
    setEndTime("");
    setCourtNumber(null);
    setCourtLabel("");
  }

  function handleArenaChange(value: string) {
    setArenaId(value);
    resetSchedule();
  }

  function openSundayPicker() {
    if (!arenaId) {
      toast.error("Selecione uma arena antes de escolher a data.");
      return;
    }
    setSundayModalOpen(true);
  }

  function openTimePicker() {
    if (!date) {
      toast.error("Escolha um domingo antes de selecionar o horário.");
      return;
    }
    setTimeModalOpen(true);
  }

  function openCourtPicker() {
    if (!date || !startTime || !endTime) {
      toast.error("Escolha data e horário antes de selecionar a quadra.");
      return;
    }
    setCourtModalOpen(true);
  }

  const dateLabel = date ? `${formatWeekdayBR(date)}, ${formatDateBR(date)}` : null;
  const timeLabel =
    startTime && endTime ? formatTimeSlotLabel(startTime, endTime) : null;

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
      toast.error("Escolha data e horário disponíveis.");
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
        resetSchedule();
        return;
      }

      const { error } = await (supabase
        .from("matches") as any)
        .insert({
          creator_id: u.user.id,
          arena_id: arenaId,
          court_number: courtNumber,
          title: title.trim(),
          modality: modality as MatchModality,
          match_type: matchType as MatchType,
          date,
          start_time: startTime,
          end_time: endTime,
          max_players: maxPlayers,
          notes: notes.trim() || null,
          status: "open" satisfies MatchStatus,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Partida criada!");
      navigate({ to: "/partidas" });
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Erro ao criar partida"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate({ to: "/partidas" })}
          className="flex items-center gap-1 text-sm text-muted-foreground mb-3 hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar
        </button>
        <h1 className="text-3xl mb-1">Criar partida amistosa</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Escolha domingo, horário e quadra com disponibilidade em tempo real.
        </p>

        <Card className="p-5 shadow-card space-y-4">
          <div>
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Treino de domingo"
              maxLength={100}
            />
          </div>

          <div>
            <Label>Arena</Label>
            <Select value={arenaId} onValueChange={handleArenaChange}>
              <SelectTrigger>
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
                <SelectTrigger>
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
                <SelectTrigger>
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

          <SchedulePickerButton
            label="Data"
            value={dateLabel}
            placeholder="Escolher domingo"
            disabled={!arenaId}
            onClick={openSundayPicker}
          />

          <SchedulePickerButton
            label="Horário"
            value={timeLabel}
            placeholder={date ? "Escolher horário" : "Escolha a data primeiro"}
            disabled={!date}
            onClick={openTimePicker}
          />

          <SchedulePickerButton
            label="Quadra"
            value={courtLabel || null}
            placeholder={
              startTime && endTime ? "Escolher quadra" : "Escolha data e horário primeiro"
            }
            disabled={!date || !startTime || !endTime}
            onClick={openCourtPicker}
          />

          {date && startTime && endTime && courtNumber ? (
            <p className="text-xs text-muted-foreground rounded-lg bg-secondary/40 px-3 py-2">
              {formatSundayLong(date)} · {timeLabel} · {courtLabel}
            </p>
          ) : null}

          <div>
            <Label>Máximo de jogadores</Label>
            <Input
              type="number"
              min={2}
              max={20}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes adicionais (opcional)"
              maxLength={500}
            />
          </div>
          <Button
            className="w-full gradient-beach text-white border-0 shadow-glow"
            onClick={handleCreate}
            disabled={saving}
          >
            {saving ? "Criando..." : "Criar partida"}
          </Button>
        </Card>

        <SundayPickerModal
          open={sundayModalOpen}
          onOpenChange={setSundayModalOpen}
          arenaId={arenaId}
          onSelect={(selectedDate) => {
            setDate(selectedDate);
            setStartTime("");
            setEndTime("");
            setCourtNumber(null);
            setCourtLabel("");
          }}
        />

        <TimeSlotPickerModal
          open={timeModalOpen}
          onOpenChange={setTimeModalOpen}
          arenaId={arenaId}
          matchDate={date}
          onSelect={(slot) => {
            setStartTime(slot.start_time);
            setEndTime(slot.end_time);
            setCourtNumber(null);
            setCourtLabel("");
          }}
        />

        <CourtPickerModal
          open={courtModalOpen}
          onOpenChange={setCourtModalOpen}
          arenaId={arenaId}
          matchDate={date}
          startTime={startTime}
          endTime={endTime}
          onSelect={(court) => {
            setCourtNumber(court.court_number);
            setCourtLabel(court.court_name);
          }}
        />
      </div>
    </AppLayout>
  );
}

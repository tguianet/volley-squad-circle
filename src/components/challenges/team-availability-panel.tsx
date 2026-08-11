import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Check, Clock, Loader2, LockKeyhole, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  getMyTeams,
  getTeamAvailability,
  listArenas,
  upsertSundayAvailability,
} from "@/lib/ranking.functions";
import { firstDayOfMonth, formatSundayLabel } from "@/lib/team-availability";
import { cn } from "@/lib/utils";

type Team = {
  id: string;
  name: string;
  category: "dupla" | "quarteto";
  gender: "M" | "F" | "X";
  captain_id: string;
  preferred_arena_id: string | null;
  is_active: boolean;
};

type Arena = { id: string; name: string; city: string | null };
type Availability = {
  id: string;
  updated_at?: string;
  sunday_date: string;
  is_available: boolean;
  time_start: string | null;
  time_end: string | null;
  arena_id: string | null;
};

function monthOptions(): Array<{ value: string; label: string }> {
  const now = new Date();
  return [0, 1, 2].map((offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return {
      value: firstDayOfMonth(date),
      label: date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    };
  });
}

function SundayEditor({
  row,
  arenas,
  canEdit,
  preferredArenaId,
  onSave,
  saving,
}: {
  row: Availability;
  arenas: Arena[];
  canEdit: boolean;
  preferredArenaId: string | null;
  onSave: (value: Availability) => void;
  saving: boolean;
}) {
  const [available, setAvailable] = useState(row.is_available);
  const [start, setStart] = useState(row.time_start?.slice(0, 5) ?? "08:00");
  const [end, setEnd] = useState(row.time_end?.slice(0, 5) ?? "12:00");
  const [arenaId, setArenaId] = useState(row.arena_id ?? preferredArenaId ?? "");
  const arenaName = arenas.find((arena) => arena.id === row.arena_id)?.name;

  return (
    <div
      className={cn(
        "rounded-xl border p-3 sm:p-4 space-y-3",
        available ? "border-primary/40 bg-primary/5" : "border-border/70 bg-card",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold capitalize">{formatSundayLabel(row.sunday_date)}</p>
          {!canEdit && row.is_available ? (
            <p className="text-xs text-muted-foreground mt-1">
              {row.time_start?.slice(0, 5)} às {row.time_end?.slice(0, 5)} · {arenaName ?? "Arena"}
            </p>
          ) : null}
        </div>
        {canEdit ? (
          <Button
            type="button"
            size="sm"
            variant={available ? "default" : "outline"}
            onClick={() => setAvailable((value) => !value)}
          >
            {available ? <Check className="size-4 mr-1" /> : null}
            {available ? "Disponível" : "Indisponível"}
          </Button>
        ) : row.is_available ? (
          <span className="text-xs font-semibold text-primary">Disponível</span>
        ) : (
          <span className="text-xs text-muted-foreground">Indisponível</span>
        )}
      </div>

      {canEdit && available ? (
        <div className="grid sm:grid-cols-[1fr_1fr_2fr] gap-3">
          <div>
            <Label htmlFor={`start-${row.id}`}>Das</Label>
            <Input
              id={`start-${row.id}`}
              type="time"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`end-${row.id}`}>Até</Label>
            <Input
              id={`end-${row.id}`}
              type="time"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </div>
          <div>
            <Label>Arena preferida</Label>
            <Select value={arenaId} onValueChange={setArenaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a arena" />
              </SelectTrigger>
              <SelectContent>
                {arenas.map((arena) => (
                  <SelectItem key={arena.id} value={arena.id}>
                    {arena.name}
                    {arena.city ? ` · ${arena.city}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {canEdit ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() =>
            onSave({
              ...row,
              is_available: available,
              time_start: available ? start : null,
              time_end: available ? end : null,
              arena_id: available ? arenaId || null : null,
            })
          }
        >
          {saving ? (
            <Loader2 className="size-4 mr-1 animate-spin" />
          ) : (
            <Check className="size-4 mr-1" />
          )}
          Salvar domingo
        </Button>
      ) : null}
    </div>
  );
}

export function TeamAvailabilityPanel() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const months = useMemo(monthOptions, []);
  const [month, setMonth] = useState(months[0].value);
  const [teamId, setTeamId] = useState<string>("");
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const fetchTeams = useServerFn(getMyTeams);
  const fetchArenas = useServerFn(listArenas);
  const fetchAvailability = useServerFn(getTeamAvailability);
  const saveAvailability = useServerFn(upsertSundayAvailability);

  const teamsQ = useQuery({ queryKey: ["my-teams-for-availability"], queryFn: () => fetchTeams() });
  const arenasQ = useQuery({ queryKey: ["active-arenas"], queryFn: () => fetchArenas() });
  const teams = (teamsQ.data ?? []) as Team[];
  const selectedTeamId = teamId || teams[0]?.id || "";
  const selectedTeam = teams.find((team) => team.id === selectedTeamId);
  const availabilityQ = useQuery({
    queryKey: ["team-availability", selectedTeamId, month],
    queryFn: () => fetchAvailability({ data: { teamId: selectedTeamId, month } }),
    enabled: Boolean(selectedTeamId),
  });

  const saveM = useMutation({
    mutationFn: (row: Availability) =>
      saveAvailability({
        data: {
          teamId: selectedTeamId,
          sundayDate: row.sunday_date,
          isAvailable: row.is_available,
          timeStart: row.time_start,
          timeEnd: row.time_end,
          arenaId: row.arena_id,
        },
      }),
    onSuccess: () => {
      toast.success("Disponibilidade salva.");
      queryClient.invalidateQueries({ queryKey: ["team-availability", selectedTeamId, month] });
      setSavingDate(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setSavingDate(null);
    },
  });

  const loading = teamsQ.isLoading || arenasQ.isLoading || availabilityQ.isLoading;
  const canEdit = selectedTeam?.captain_id === user?.id;
  const availableCount = ((availabilityQ.data ?? []) as Availability[]).filter(
    (row) => row.is_available,
  ).length;

  return (
    <Card className="p-4 sm:p-5 space-y-4 border-primary/20 shadow-card">
      <div className="flex items-start gap-3">
        <div className="size-11 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
          <CalendarDays className="size-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-bold text-lg">Disponibilidade mensal</h3>
          <p className="text-sm text-muted-foreground">
            Informe os domingos em que sua equipe pode jogar. Esses horários serão cruzados com a
            equipe adversária e a agenda das quadras.
          </p>
        </div>
      </div>

      {teams.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Equipe</Label>
            <Select value={selectedTeamId} onValueChange={setTeamId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} · {team.category === "dupla" ? "Dupla" : "Quarteto"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mês</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((item) => (
                  <SelectItem className="capitalize" key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {selectedTeam && !selectedTeam.is_active ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          Esta equipe ainda está em formação. Você pode preparar a disponibilidade, mas só poderá
          desafiar quando todos aceitarem.
        </div>
      ) : null}
      {selectedTeam && !canEdit ? (
        <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          <LockKeyhole className="size-4" />
          Somente o capitão pode alterar. Você está visualizando a agenda da equipe.
        </div>
      ) : null}
      {selectedTeam ? (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {availableCount} domingo(s) disponível(is)
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            Escolha uma arena para cada domingo
          </span>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : teams.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-semibold">Você ainda não participa de uma equipe.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Monte sua equipe convidando jogadores pela rede social.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {((availabilityQ.data ?? []) as Availability[]).map((row) => (
            <SundayEditor
              key={`${row.id}-${row.updated_at ?? ""}`}
              row={row}
              arenas={(arenasQ.data ?? []) as Arena[]}
              canEdit={canEdit}
              preferredArenaId={selectedTeam?.preferred_arena_id ?? null}
              saving={saveM.isPending && savingDate === row.sunday_date}
              onSave={(value) => {
                setSavingDate(row.sunday_date);
                saveM.mutate(value);
              }}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

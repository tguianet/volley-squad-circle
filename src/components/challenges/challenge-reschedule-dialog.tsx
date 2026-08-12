import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Clock, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  findCommonSundays,
  getAvailableChallengeCourts,
  listArenas,
  proposeChallengeReschedule,
} from "@/lib/ranking.functions";
import { hourlyStartsWithinWindow, validateRescheduleSelection } from "@/lib/challenge-scheduling";
import { cn } from "@/lib/utils";

export type RescheduleTarget = {
  id: string;
  challenger: { id: string; name: string } | null;
  challenged: { id: string; name: string } | null;
};

type CommonSunday = {
  sunday_date: string;
  overlap_start: string;
  overlap_end: string;
  challenger_arena_id: string | null;
};

type Court = { court_id: string; court_number: number; court_name: string };

export function ChallengeRescheduleDialog({
  challenge,
  open,
  onOpenChange,
  onSaved,
}: {
  challenge: RescheduleTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [courtId, setCourtId] = useState("");
  const [reason, setReason] = useState("");
  const fetchCommonSundays = useServerFn(findCommonSundays);
  const fetchCourts = useServerFn(getAvailableChallengeCourts);
  const fetchArenas = useServerFn(listArenas);
  const propose = useServerFn(proposeChallengeReschedule);

  const sundaysQ = useQuery({
    queryKey: ["reschedule-sundays", challenge?.id],
    queryFn: () =>
      fetchCommonSundays({
        data: {
          challengerTeamId: challenge!.challenger!.id,
          challengedTeamId: challenge!.challenged!.id,
        },
      }),
    enabled: open && !!challenge?.challenger && !!challenge?.challenged,
  });
  const arenasQ = useQuery({
    queryKey: ["arenas"],
    queryFn: () => fetchArenas(),
    enabled: open,
  });
  const sundays = (sundaysQ.data ?? []) as CommonSunday[];
  const overlap = sundays.find((item) => item.sunday_date === date);
  const arenaId = overlap?.challenger_arena_id ?? "";
  const times = useMemo(
    () => (overlap ? hourlyStartsWithinWindow(overlap.overlap_start, overlap.overlap_end) : []),
    [overlap],
  );
  const courtsQ = useQuery({
    queryKey: ["reschedule-courts", date, time, arenaId],
    queryFn: () => fetchCourts({ data: { date, time, arenaId } }),
    enabled: open && !!date && !!time && !!arenaId,
  });
  const courts = (courtsQ.data ?? []) as Court[];
  const arenaName = (arenasQ.data ?? []).find((arena) => arena.id === arenaId)?.name;

  const saveM = useMutation({
    mutationFn: propose,
    onSuccess: () => {
      toast.success("Contraproposta enviada e nova quadra pré-bloqueada.");
      onSaved();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const validationError = validateRescheduleSelection({ date, time, courtId, arenaId, reason });
  const canSave = !!challenge && !validationError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Propor novo horário</DialogTitle>
          <DialogDescription>
            A quadra atual será liberada quando esta contraproposta for criada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarDays className="size-4" /> Domingo compatível
            </Label>
            {sundaysQ.isLoading ? (
              <p className="text-sm text-muted-foreground">Cruzando agendas…</p>
            ) : sundays.length === 0 ? (
              <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                Nenhum domingo compatível. Ajuste a disponibilidade mensal das equipes.
              </p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {sundays.map((item) => (
                  <button
                    key={item.sunday_date}
                    type="button"
                    className={cn(
                      "shrink-0 rounded-xl border px-4 py-3 text-sm font-semibold",
                      date === item.sunday_date
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border",
                    )}
                    onClick={() => {
                      setDate(item.sunday_date);
                      setTime("");
                      setCourtId("");
                    }}
                  >
                    {new Date(`${item.sunday_date}T12:00:00`).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </button>
                ))}
              </div>
            )}
          </section>

          {overlap ? (
            <section className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="size-4" /> Horário
              </Label>
              <p className="text-xs text-muted-foreground">
                {arenaName ?? "Arena"} · {overlap.overlap_start.slice(0, 5)} às{" "}
                {overlap.overlap_end.slice(0, 5)}
              </p>
              <div className="flex flex-wrap gap-2">
                {times.map((item) => (
                  <Button
                    key={item}
                    type="button"
                    size="sm"
                    variant={time === item ? "default" : "outline"}
                    onClick={() => {
                      setTime(item);
                      setCourtId("");
                    }}
                  >
                    {item}
                  </Button>
                ))}
              </div>
            </section>
          ) : null}

          {time ? (
            <section className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="size-4" /> Quadra livre
              </Label>
              {courtsQ.isLoading ? (
                <p className="text-sm text-muted-foreground">Consultando quadras…</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {courts.map((court) => (
                    <Button
                      key={court.court_id}
                      type="button"
                      variant={courtId === court.court_id ? "default" : "outline"}
                      onClick={() => setCourtId(court.court_id)}
                    >
                      {court.court_name}
                    </Button>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          <section className="space-y-2">
            <Label htmlFor="reschedule-reason">Motivo da alteração</Label>
            <Textarea
              id="reschedule-reason"
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex.: nossa equipe só consegue jogar após as 10h."
            />
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!canSave || saveM.isPending}
            onClick={() =>
              saveM.mutate({
                data: { challengeId: challenge!.id, date, time, arenaId, courtId, reason },
              })
            }
          >
            {saveM.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Enviar contraproposta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

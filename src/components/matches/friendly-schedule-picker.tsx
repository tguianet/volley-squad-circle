import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, Info, MapPin, Users, Volleyball } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  addOneHourToTime,
  formatMatchDateLabel,
  nextRankingSundays,
  type CourtSlot,
} from "@/lib/court-schedule";
import { formatTimeSlotLabel } from "@/lib/date-format";

export type FriendlyScheduleValue = {
  date: string;
  startTime: string;
  endTime: string;
  courtNumber: number;
  courtName: string;
};

type Props = {
  arenaId: string;
  date: string;
  startTime: string;
  endTime: string;
  courtNumber: number | null;
  courtName: string;
  onChange: (value: Partial<FriendlyScheduleValue>) => void;
};

export function FriendlySchedulePicker({
  arenaId,
  date,
  startTime,
  endTime,
  courtNumber,
  courtName,
  onChange,
}: Props) {
  const sundays = useMemo(() => nextRankingSundays(6), []);

  const availQ = useQuery({
    queryKey: ["court-availability", date, arenaId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("court_availability", { _date: date });
      if (error) throw error;
      return (data ?? []) as CourtSlot[];
    },
    enabled: !!date && !!arenaId,
  });

  const slots = availQ.data ?? [];

  const availableTimes = useMemo(() => {
    const set = new Set<string>();
    slots.forEach((s) => {
      if (s.is_free) set.add(s.slot_time.slice(0, 5));
    });
    return Array.from(set).sort();
  }, [slots]);

  const availableCourts = useMemo(() => {
    if (!startTime) return [];
    const m = new Map<number, CourtSlot>();
    slots.forEach((s) => {
      if (s.slot_time.slice(0, 5) === startTime.slice(0, 5) && s.is_free) {
        m.set(s.court_number, s);
      }
    });
    return Array.from(m.values()).sort((a, b) => a.court_number - b.court_number);
  }, [slots, startTime]);

  const scheduleSummary =
    date && startTime && endTime && courtNumber
      ? `${formatMatchDateLabel(date)} · ${formatTimeSlotLabel(startTime, endTime)} · ${courtName || `Quadra ${courtNumber}`}`
      : null;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border-l-4 border-accent bg-accent/5 p-4 flex items-start gap-3">
        <Info className="size-5 text-accent shrink-0 mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
            <span className="coastal-pill bg-accent/15 text-accent border border-accent/25 text-[10px]">
              Partida amistosa
            </span>
            Agenda compartilhada com o Ranking
          </p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Mesmos domingos e horários das quadras usados nos desafios oficiais. Desafios de ranking
            têm prioridade na reserva — horários livres aqui são para jogos amistosos.
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 text-primary mb-3">
          <CalendarDays className="size-4" />
          <h3 className="font-display font-bold">Domingo</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {sundays.map((s) => (
            <button
              key={s.iso}
              type="button"
              disabled={!arenaId}
              onClick={() =>
                onChange({
                  date: s.iso,
                  startTime: "",
                  endTime: "",
                  courtNumber: undefined,
                  courtName: "",
                })
              }
              className={cn(
                "shrink-0 w-24 h-32 rounded-xl border-2 flex flex-col items-center justify-center transition-all",
                date === s.iso
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border hover:border-primary/50 hover:bg-primary/5",
                !arenaId && "opacity-50 cursor-not-allowed",
              )}
            >
              <span
                className={cn(
                  "text-xs uppercase font-bold",
                  date === s.iso ? "text-primary" : "text-muted-foreground",
                )}
              >
                {s.month}
              </span>
              <span
                className={cn(
                  "text-3xl font-display font-bold my-1",
                  date === s.iso && "text-primary",
                )}
              >
                {s.day}
              </span>
              <span className="text-xs font-semibold text-accent">DOM</span>
            </button>
          ))}
        </div>
      </div>

      {date ? (
        <div>
          <div className="flex items-center gap-2 text-primary mb-3">
            <Clock className="size-4" />
            <h3 className="font-display font-bold">Horário</h3>
          </div>
          {availQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando horários…</p>
          ) : availableTimes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum horário livre neste domingo.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {availableTimes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    const end = addOneHourToTime(`${t}:00`);
                    onChange({
                      startTime: `${t}:00`,
                      endTime: end,
                      courtNumber: undefined,
                      courtName: "",
                    });
                  }}
                  className={cn(
                    "py-3 rounded-lg border-2 font-bold text-sm transition-all",
                    startTime.slice(0, 5) === t
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border bg-card hover:border-primary/50 hover:bg-primary/5",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {date && startTime ? (
        <div>
          <div className="flex items-center gap-2 text-primary mb-3">
            <MapPin className="size-4" />
            <h3 className="font-display font-bold">Quadra</h3>
          </div>
          {availableCourts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma quadra livre neste horário.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableCourts.map((c) => {
                const selected = courtNumber === c.court_number;
                return (
                  <button
                    key={c.court_id}
                    type="button"
                    onClick={() =>
                      onChange({
                        courtNumber: c.court_number,
                        courtName: c.court_name,
                      })
                    }
                    className={cn(
                      "text-left rounded-xl overflow-hidden border-2 transition-all bg-card",
                      selected
                        ? "border-primary shadow-lg ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <div className="relative h-28 bg-gradient-to-br from-primary/20 via-accent/10 to-muted">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute top-2 left-2 coastal-pill bg-emerald-500/90 text-white border-0 text-[10px]">
                        Amistoso
                      </div>
                      <div className="absolute bottom-3 left-3 text-white">
                        <p className="font-bold">{c.court_name}</p>
                        <p className="text-[10px] uppercase opacity-80">Quadra {c.court_number}</p>
                      </div>
                    </div>
                    <div className="p-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Volleyball className="size-3.5 text-primary" />
                      Disponível para partida amistosa
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {scheduleSummary ? (
        <div className="rounded-lg bg-primary/5 border border-primary/15 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
          <Users className="size-3.5 text-primary shrink-0" />
          <span>
            <span className="font-semibold text-primary">Reserva amistosa:</span> {scheduleSummary}
          </span>
        </div>
      ) : null}
    </div>
  );
}

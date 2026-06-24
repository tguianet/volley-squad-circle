import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";

import { CalendarDays, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agenda/")({
  head: () => ({ meta: [{ title: "Agenda — PlayBeach" }] }),
  component: AgendaPage,
});

type CourtSlot = {
  court_id: string;
  court_number: number;
  court_name: string;
  slot_time: string; // "HH:MM:SS"
  is_free: boolean;
};

function nextSundays(count = 6): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const daysUntilSunday = dow === 0 ? 0 : 7 - dow;
  const first = new Date(today);
  first.setDate(today.getDate() + daysUntilSunday);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(first);
    d.setDate(first.getDate() + i * 7);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function formatSundayLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = date.toLocaleDateString("pt-BR", { weekday: "long" });
  const month = date.toLocaleDateString("pt-BR", { month: "long" });
  return {
    weekday: dayName,
    day: String(d).padStart(2, "0"),
    month,
    full: `${dayName.toUpperCase()}, ${d} DE ${month.toUpperCase()}`,
  };
}

function AgendaPage() {
  const sundays = useMemo(() => nextSundays(6), []);
  const [selectedDate, setSelectedDate] = useState<string>(sundays[0]);

  const { data, isLoading } = useQuery({
    queryKey: ["court-availability", selectedDate],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("court_availability", {
        _date: selectedDate,
      });
      if (error) throw error;
      return (data ?? []) as CourtSlot[];
    },
  });

  const slots = data ?? [];

  // Group by court, preserving order from RPC (ORDER BY number, slot_time)
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { court_id: string; court_number: number; court_name: string; times: CourtSlot[] }
    >();
    for (const s of slots) {
      const key = s.court_id;
      if (!map.has(key)) {
        map.set(key, {
          court_id: s.court_id,
          court_number: s.court_number,
          court_name: s.court_name,
          times: [],
        });
      }
      map.get(key)!.times.push(s);
    }
    return Array.from(map.values()).sort((a, b) => a.court_number - b.court_number);
  }, [slots]);

  const totalFree = slots.filter((s) => s.is_free).length;
  const totalOccupied = slots.length - totalFree;
  const headerLabel = formatSundayLabel(selectedDate);

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2 block">
              Disponibilidade em Tempo Real
            </span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl leading-[1.05] tracking-wide flex items-center gap-3">
              {headerLabel.full}
              <CalendarDays className="size-7 text-primary" />
            </h1>
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
              <MapPin className="size-3.5" /> PlayBeach Arena · Rio Preto
            </p>
          </div>

          <Card className="p-2 flex items-center gap-3 shadow-sm">
            <div className="flex items-center gap-2 px-3 py-1">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {totalFree} livres
              </span>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2 px-3 py-1">
              <div className="w-3 h-3 rounded-full bg-muted border border-border" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {totalOccupied} ocupados
              </span>
            </div>
          </Card>
        </div>

        {/* Sunday selector */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 -mx-1 px-1">
          {sundays.map((iso) => {
            const lbl = formatSundayLabel(iso);
            const active = iso === selectedDate;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDate(iso)}
                className={cn(
                  "shrink-0 rounded-xl border px-4 py-3 text-left transition-all min-w-[110px]",
                  active
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-card hover:border-border/80 hover:bg-muted/50",
                )}
              >
                <div
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {lbl.weekday.slice(0, 3)}
                </div>
                <div className="font-display text-2xl leading-none mt-1">{lbl.day}</div>
                <div className="text-[11px] text-muted-foreground capitalize mt-1">
                  {lbl.month}
                </div>
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {isLoading ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Carregando disponibilidade…</Card>
        ) : grouped.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma quadra disponível para esta data.
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
            {grouped.map((court) => (
              <div key={court.court_id} className="flex flex-col gap-3">
                <Card className="p-3 text-center border-b-4 border-b-primary/40 shadow-sm">
                  <h3 className="font-display text-base sm:text-lg uppercase truncate text-primary">
                    {court.court_name}
                  </h3>
                  <p className="text-[10px] font-semibold text-muted-foreground tracking-tighter uppercase mt-0.5">
                    Areia Premium
                  </p>
                </Card>
                <div className="flex flex-col gap-2">
                  {court.times.map((slot) => {
                    const time = slot.slot_time.slice(0, 5);
                    return (
                      <button
                        key={`${court.court_id}-${slot.slot_time}`}
                        type="button"
                        disabled={!slot.is_free}
                        className={cn(
                          "group relative overflow-hidden h-16 sm:h-20 rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5",
                          slot.is_free
                            ? "bg-card border-border hover:border-primary hover:bg-primary/5 cursor-pointer"
                            : "bg-muted/40 border-border/40 opacity-50 cursor-not-allowed",
                        )}
                      >
                        <span
                          className={cn(
                            "font-display text-xl sm:text-2xl leading-none tracking-tight",
                            slot.is_free
                              ? "text-foreground group-hover:text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          {time}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1">
                          {slot.is_free ? (
                            <>
                              <Clock className="size-2.5" /> Disponível
                            </>
                          ) : (
                            "Ocupado"
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-6 space-y-2">
          <span className="block">
            Disponibilidade dos domingos de 08:00 às 17:00 — mesma grade usada nos desafios de
            ranking.
          </span>
          <span className="block">
            Horários livres podem ser reservados para{" "}
            <span className="font-semibold text-primary">partidas amistosas</span> ou{" "}
            <span className="font-semibold text-accent">desafios oficiais</span> (estes têm
            prioridade).
          </span>
        </p>
      </div>
    </AppLayout>
  );
}

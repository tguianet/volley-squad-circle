import { untyped } from "@/lib/supabase-untyped";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";

import { CalendarDays, Clock, MapPin, Sun, Waves } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agenda/")({
  head: () => ({
    meta: [
      { title: "Agenda de quadras — PlayBeach" },
      {
        name: "description",
        content:
          "Veja em tempo real os horários livres e ocupados das quadras de areia da PlayBeach Arena nos domingos de ranking.",
      },
      { property: "og:title", content: "Agenda de quadras — PlayBeach" },
      {
        property: "og:description",
        content: "Disponibilidade em tempo real das quadras da PlayBeach Arena.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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
      const { data, error } = await untyped().rpc("court_availability", {
        _date: selectedDate,
      });
      if (error) throw error;
      return (data ?? []) as CourtSlot[];
    },
  });

  const slots = useMemo(() => data ?? [], [data]);

  const courts = useMemo(() => {
    const map = new Map<string, { court_id: string; court_number: number; court_name: string }>();
    for (const s of slots) {
      if (!map.has(s.court_id)) {
        map.set(s.court_id, {
          court_id: s.court_id,
          court_number: s.court_number,
          court_name: s.court_name,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.court_number - b.court_number);
  }, [slots]);

  const times = useMemo(() => Array.from(new Set(slots.map((s) => s.slot_time))).sort(), [slots]);

  const slotIndex = useMemo(() => {
    const map = new Map<string, CourtSlot>();
    for (const s of slots) map.set(`${s.court_id}|${s.slot_time}`, s);
    return map;
  }, [slots]);

  const totalFree = slots.filter((s) => s.is_free).length;
  const totalOccupied = slots.length - totalFree;
  const occupancy = slots.length > 0 ? Math.round((totalOccupied / slots.length) * 100) : 0;
  const headerLabel = formatSundayLabel(selectedDate);

  return (
    <AppLayout>
      <div className="font-[family-name:var(--font-body)] max-w-[1400px] mx-auto px-3 sm:px-6 py-6 sm:py-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[0_18px_50px_-30px_oklch(0.52_0.12_225/0.55)] mb-6">
          <div
            className="absolute inset-0 opacity-[0.14]"
            style={{ background: "var(--gradient-beach)" }}
            aria-hidden
          />
          <div
            className="absolute -right-24 -top-24 size-72 rounded-full blur-3xl opacity-25"
            style={{ background: "var(--gradient-ocean)" }}
            aria-hidden
          />
          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 p-5 sm:p-7">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                <Waves className="size-3" /> Disponibilidade em tempo real
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[0.95] tracking-wide mt-3 flex flex-wrap items-center gap-3">
                {headerLabel.full}
                <CalendarDays className="size-8 text-primary shrink-0" />
              </h1>
              <p className="text-sm text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> PlayBeach Arena · Rio Preto
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Sun className="size-3.5" /> {times.length} horários · {courts.length} quadras
                </span>
              </p>
            </div>

            {/* Ocupação */}
            <div className="w-full lg:w-72 rounded-2xl border border-border/70 bg-background/70 backdrop-blur-sm p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Ocupação do dia
                </span>
                <span className="font-display text-3xl leading-none">{occupancy}%</span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-500"
                  style={{ width: `${occupancy}%` }}
                />
              </div>
              <div className="mt-3 flex items-center gap-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-primary" /> {totalFree} livres
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-muted border border-border" />{" "}
                  {totalOccupied} ocupados
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sunday selector */}
        <div className="flex gap-2.5 overflow-x-auto pb-3 mb-6 -mx-1 px-1">
          {sundays.map((iso) => {
            const lbl = formatSundayLabel(iso);
            const active = iso === selectedDate;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDate(iso)}
                className={cn(
                  "group shrink-0 relative overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all min-w-[112px]",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-[0_12px_28px_-16px_oklch(0.52_0.12_225/0.8)]"
                    : "border-border bg-card hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md",
                )}
              >
                <div
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-[0.2em]",
                    active ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {lbl.weekday.slice(0, 3)}
                </div>
                <div className="font-display text-3xl leading-none mt-1">{lbl.day}</div>
                <div
                  className={cn(
                    "text-[11px] capitalize mt-1",
                    active ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {lbl.month}
                </div>
              </button>
            );
          })}
        </div>

        {/* Matriz quadra × horário */}
        {isLoading ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Carregando disponibilidade…
          </Card>
        ) : courts.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma quadra disponível para esta data.
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <div
                className="min-w-[720px]"
                style={{
                  display: "grid",
                  gridTemplateColumns: `76px repeat(${courts.length}, minmax(84px, 1fr))`,
                }}
              >
                {/* Header row */}
                <div className="sticky left-0 z-20 bg-card border-b border-r border-border px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Hora
                </div>
                {courts.map((court) => (
                  <div
                    key={court.court_id}
                    className="border-b border-border bg-gradient-to-b from-primary/8 to-transparent px-2 py-3 text-center"
                  >
                    <div className="font-display text-lg sm:text-xl uppercase leading-none text-primary truncate">
                      {court.court_name}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground mt-1">
                      Areia premium
                    </div>
                  </div>
                ))}

                {/* Body rows */}
                {times.map((time) => (
                  <div key={time} className="contents">
                    <div className="sticky left-0 z-10 bg-card border-r border-b border-border/70 px-3 py-4 flex items-center">
                      <span className="font-display text-xl leading-none tracking-tight">
                        {time.slice(0, 5)}
                      </span>
                    </div>
                    {courts.map((court) => {
                      const slot = slotIndex.get(`${court.court_id}|${time}`);
                      const free = slot?.is_free ?? false;
                      return (
                        <div
                          key={`${court.court_id}-${time}`}
                          className="border-b border-border/60 p-1.5"
                        >
                          <button
                            type="button"
                            disabled={!free}
                            className={cn(
                              "group relative w-full h-14 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5",
                              free
                                ? "border-primary/25 bg-primary/[0.06] hover:bg-primary hover:border-primary hover:shadow-[0_10px_24px_-14px_oklch(0.52_0.12_225/0.9)] cursor-pointer"
                                : "border-dashed border-border bg-muted/40 opacity-60 cursor-not-allowed",
                            )}
                          >
                            <span
                              className={cn(
                                "text-[10px] font-bold uppercase tracking-[0.14em] inline-flex items-center gap-1",
                                free
                                  ? "text-primary group-hover:text-primary-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              {free ? (
                                <>
                                  <Clock className="size-2.5" /> Livre
                                </>
                              ) : (
                                "Ocupado"
                              )}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-medium",
                                free
                                  ? "text-muted-foreground group-hover:text-primary-foreground/80"
                                  : "text-muted-foreground/70",
                              )}
                            >
                              {time.slice(0, 5)}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Legenda */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="size-3 rounded-md border border-primary/30 bg-primary/[0.08]" /> Livre
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-3 rounded-md border border-dashed border-border bg-muted/50" />{" "}
            Ocupado
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-3 rounded-md bg-accent" /> Desafio oficial tem prioridade
          </span>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4 space-y-2">
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

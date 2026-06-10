import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { duplas, getPlayer } from "@/lib/mock-data";
import { CalendarDays, Clock, MapPin } from "lucide-react";

export const Route = createFileRoute("/agenda/")({
  head: () => ({ meta: [{ title: "Agenda — BeachPlay Arena" }] }),
  component: AgendaPage,
});

const HOURS = Array.from({ length: 9 }, (_, i) => 8 + i); // 8..16 (jogos das 8h às 17h)
const COURTS = Array.from({ length: 7 }, (_, i) => i + 1);

// Distribui duplas em jogos pseudo-aleatórios mas estáveis
function getMatch(hour: number, court: number) {
  const seed = (hour * 13 + court * 7) % duplas.length;
  const dupla1 = duplas[seed];
  const dupla2 = duplas[(seed + 3) % duplas.length];
  if (!dupla1 || !dupla2 || dupla1.id === dupla2.id) return null;
  // deixa algumas quadras vagas
  if ((hour + court) % 5 === 0) return null;
  return { dupla1, dupla2 };
}

function nextSunday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

function AgendaPage() {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="size-10 rounded-xl gradient-beach flex items-center justify-center shadow-glow">
            <CalendarDays className="size-5 text-white" />
          </div>
          <h1 className="text-3xl">Agenda</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4 capitalize">
          Próximo domingo · {nextSunday()} · 08:00 às 17:00 · 7 quadras
        </p>

        {/* Desktop: grid de quadras x horários */}
        <div className="hidden md:block overflow-x-auto">
          <div className="min-w-[900px]">
            <div
              className="grid gap-2 mb-2"
              style={{ gridTemplateColumns: `90px repeat(${COURTS.length}, minmax(120px, 1fr))` }}
            >
              <div />
              {COURTS.map((c) => (
                <div key={c} className="text-center text-xs font-semibold py-2 rounded-md bg-secondary">
                  <MapPin className="size-3 inline mr-1" />
                  Quadra {c}
                </div>
              ))}
            </div>

            {HOURS.map((h) => (
              <div
                key={h}
                className="grid gap-2 mb-2"
                style={{ gridTemplateColumns: `90px repeat(${COURTS.length}, minmax(120px, 1fr))` }}
              >
                <div className="flex items-center justify-center text-sm font-semibold text-muted-foreground">
                  {String(h).padStart(2, "0")}:00
                </div>
                {COURTS.map((c) => {
                  const m = getMatch(h, c);
                  return (
                    <Card
                      key={c}
                      className={
                        "p-2 text-[11px] leading-tight " +
                        (m ? "border-primary/30" : "bg-muted/30 border-dashed")
                      }
                    >
                      {m ? (
                        <div className="space-y-1">
                          <div className="font-semibold truncate">
                            {getPlayer(m.dupla1.players[0])?.name.split(" ")[0]} /{" "}
                            {getPlayer(m.dupla1.players[1])?.name.split(" ")[0]}
                          </div>
                          <div className="text-muted-foreground text-center text-[10px]">vs</div>
                          <div className="font-semibold truncate">
                            {getPlayer(m.dupla2.players[0])?.name.split(" ")[0]} /{" "}
                            {getPlayer(m.dupla2.players[1])?.name.split(" ")[0]}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground text-[10px] py-2">Livre</div>
                      )}
                    </Card>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: lista por horário */}
        <div className="md:hidden space-y-4">
          {HOURS.map((h) => (
            <div key={h}>
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                <Clock className="size-4 text-primary" />
                {String(h).padStart(2, "0")}:00
              </div>
              <div className="space-y-2">
                {COURTS.map((c) => {
                  const m = getMatch(h, c);
                  return (
                    <Card key={c} className="p-3 flex items-center justify-between gap-3">
                      <Badge variant="secondary" className="shrink-0">Q{c}</Badge>
                      {m ? (
                        <div className="flex-1 text-xs">
                          <div className="font-semibold truncate">
                            {getPlayer(m.dupla1.players[0])?.name.split(" ")[0]} /{" "}
                            {getPlayer(m.dupla1.players[1])?.name.split(" ")[0]}
                          </div>
                          <div className="text-muted-foreground">vs</div>
                          <div className="font-semibold truncate">
                            {getPlayer(m.dupla2.players[0])?.name.split(" ")[0]} /{" "}
                            {getPlayer(m.dupla2.players[1])?.name.split(" ")[0]}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 text-xs text-muted-foreground">Quadra livre</div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

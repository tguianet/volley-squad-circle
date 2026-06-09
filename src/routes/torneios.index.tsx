import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tournaments, getArena } from "@/lib/mock-data";
import { formatDateBR } from "@/lib/date-format";
import { Calendar, MapPin, Trophy, Users } from "lucide-react";

export const Route = createFileRoute("/torneios/")({
  head: () => ({ meta: [{ title: "Torneios — BeachPlay Arena" }] }),
  component: TournamentsPage,
});

const statusColor: Record<string, string> = {
  "Inscrições abertas": "bg-success text-white",
  "Em andamento": "bg-accent text-white",
  "Finalizado": "bg-muted text-muted-foreground",
};

function TournamentsPage() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-3xl">Torneios</h1>
        <p className="text-sm text-muted-foreground mb-6">Campeonatos abertos na sua região.</p>

        <div className="space-y-4">
          {tournaments.map(t => {
            const a = getArena(t.arenaId);
            return (
              <Link key={t.id} to="/torneios/$id" params={{ id: t.id }}>
                <Card className="overflow-hidden shadow-card hover:shadow-glow transition-shadow group">
                  <div className="grid sm:grid-cols-[200px_1fr]">
                    <div className="relative h-40 sm:h-full">
                      <img src={t.cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform"/>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent sm:bg-gradient-to-r"/>
                      <Badge className={`${statusColor[t.status]} absolute top-3 left-3 border-0`}>{t.status}</Badge>
                    </div>
                    <div className="p-5 space-y-2">
                      <h3 className="font-display text-2xl leading-tight">{t.name}</h3>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="size-3.5"/>{a?.name}</span>
                        <span className="flex items-center gap-1"><Calendar className="size-3.5"/>{formatDateBR(t.startDate)}</span>
                        <span className="flex items-center gap-1"><Users className="size-3.5"/>{t.duplas.length} duplas</span>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Badge variant="secondary">{t.category}</Badge>
                        <div className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-accent">
                          <Trophy className="size-4"/>{t.prize}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

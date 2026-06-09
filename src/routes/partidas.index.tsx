import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { matches as initialMatches, getArena, getPlayer } from "@/lib/mock-data";
import { Calendar, Clock, MapPin, Users, Plus, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/partidas/")({
  head: () => ({ meta: [{ title: "Partidas abertas — BeachPlay Arena" }] }),
  component: MatchesPage,
});

const levelColor: Record<string, string> = {
  Iniciante: "bg-success/20 text-success-foreground",
  Intermediário: "bg-primary/20 text-primary",
  Avançado: "bg-accent/20 text-accent",
  Profissional: "bg-destructive/20 text-destructive",
};

function MatchesPage() {
  const [matches, setMatches] = useState(initialMatches);
  const [joined, setJoined] = useState<Record<string, boolean>>({});

  const handleJoin = (id: string) => {
    if (joined[id]) return;
    const match = matches.find((x) => x.id === id);
    if (!match || match.slotsTaken >= match.slotsTotal) return;
    setJoined((j) => ({ ...j, [id]: true }));
    setMatches((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, slotsTaken: m.slotsTaken + 1 } : m
      )
    );
    const a = getArena(match.arenaId);
    toast.success("Você entrou no grupo!", {
      description: a ? `Partida em ${a.name}` : undefined,
    });
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl">Partidas abertas</h1>
            <p className="text-sm text-muted-foreground">Encontre seu próximo jogo na areia.</p>
          </div>
          <Link to="/partidas/nova">
            <Button className="gradient-beach text-white border-0 shadow-glow"><Plus className="size-4 mr-1"/>Nova</Button>
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {matches.map((m) => {
            const a = getArena(m.arenaId);
            const host = getPlayer(m.hostId);
            const full = m.slotsTaken >= m.slotsTotal;
            const isJoined = !!joined[m.id];
            return (
              <Card key={m.id} className="overflow-hidden shadow-card group hover:shadow-glow transition-shadow">
                <div className="relative h-32">
                  <img src={a?.cover} alt={a?.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"/>
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className={`${levelColor[m.level]} border-0`}>{m.level}</Badge>
                    <Badge variant="secondary" className="bg-white/90 text-foreground">{m.type}</Badge>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <div className="font-display text-lg leading-tight">{a?.name}</div>
                    <div className="text-xs flex items-center gap-1 opacity-90"><MapPin className="size-3"/>{a?.city}</div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1.5"><Calendar className="size-4 text-primary"/>{new Date(m.date).toLocaleDateString("pt-BR", {day:"2-digit", month:"short"})}</span>
                    <span className="flex items-center gap-1.5"><Clock className="size-4 text-primary"/>{m.time}</span>
                    <span className="flex items-center gap-1.5 ml-auto text-xs text-muted-foreground"><Users className="size-3.5"/>{m.slotsTaken}/{m.slotsTotal}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{m.notes}</p>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-muted-foreground">Host: <span className="font-semibold text-foreground">{host?.name.split(" ")[0]}</span></div>
                    <Button
                      size="sm"
                      disabled={full || isJoined}
                      onClick={() => handleJoin(m.id)}
                      className={full ? "" : isJoined ? "bg-success text-success-foreground border-0" : "gradient-beach text-white border-0"}
                    >
                      {full ? "Lotada" : isJoined ? (<><Check className="size-4 mr-1"/>No grupo</>) : "Quero jogar"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

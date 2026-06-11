import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";

export const Route = createFileRoute("/partidas/")({
  head: () => ({ meta: [{ title: "Partidas abertas — PlayBeach" }] }),
  component: MatchesPage,
});

function MatchesPage() {
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

        <Card className="p-10 text-center shadow-card">
          <div className="size-14 mx-auto rounded-2xl gradient-beach flex items-center justify-center mb-4">
            <Users className="size-7 text-white"/>
          </div>
          <div className="font-display text-xl mb-1">Nenhuma partida aberta</div>
          <p className="text-sm text-muted-foreground">
            Crie a primeira partida amistosa e convoque a galera.
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}

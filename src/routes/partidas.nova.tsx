import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/partidas/nova")({
  head: () => ({ meta: [{ title: "Criar partida — PlayBeach" }] }),
  component: NewMatchPage,
});

function NewMatchPage() {
  const navigate = useNavigate();
  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-6">
        <button onClick={() => navigate({ to: "/partidas" })} className="flex items-center gap-1 text-sm text-muted-foreground mb-3 hover:text-foreground">
          <ArrowLeft className="size-4"/> Voltar
        </button>
        <h1 className="text-3xl mb-1">Criar partida amistosa</h1>
        <p className="text-sm text-muted-foreground mb-6">Monte sua partida e convoque a galera.</p>

        <Card className="p-10 text-center shadow-card">
          <div className="font-display text-xl mb-1">Em breve</div>
          <p className="text-sm text-muted-foreground mb-4">
            A criação de partidas amistosas será liberada em breve.
          </p>
          <Button variant="outline" onClick={() => navigate({ to: "/partidas" })}>Voltar para partidas</Button>
        </Card>
      </div>
    </AppLayout>
  );
}

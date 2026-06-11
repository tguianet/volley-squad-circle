import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/torneios/")({
  head: () => ({ meta: [{ title: "Torneios — PlayBeach" }] }),
  component: TournamentsPage,
});

function TournamentsPage() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-3xl">Torneios</h1>
        <p className="text-sm text-muted-foreground mb-6">Campeonatos abertos na sua região.</p>

        <Card className="p-10 text-center shadow-card">
          <div className="size-14 mx-auto rounded-2xl gradient-beach flex items-center justify-center mb-4">
            <Trophy className="size-7 text-white"/>
          </div>
          <div className="font-display text-xl mb-1">Nenhum torneio publicado ainda</div>
          <p className="text-sm text-muted-foreground">
            Quando torneios forem criados pela organização, eles aparecem aqui.
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}

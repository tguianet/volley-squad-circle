import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export const Route = createFileRoute("/agenda/")({
  head: () => ({ meta: [{ title: "Agenda — PlayBeach" }] }),
  component: AgendaPage,
});

function AgendaPage() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="size-10 rounded-xl gradient-beach flex items-center justify-center shadow-glow">
            <CalendarDays className="size-5 text-white" />
          </div>
          <h1 className="text-3xl">Agenda</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Confrontos agendados aparecem aqui.
        </p>

        <Card className="p-10 text-center shadow-card">
          <div className="font-display text-xl mb-1">Sem confrontos agendados</div>
          <p className="text-sm text-muted-foreground">
            A agenda será preenchida quando houver desafios marcados.
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}

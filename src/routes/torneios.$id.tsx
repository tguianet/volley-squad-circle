import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/torneios/$id")({
  head: () => ({ meta: [{ title: "Torneio — PlayBeach" }] }),
  component: TournamentDetail,
});

function TournamentDetail() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link
          to="/torneios"
          className="flex items-center gap-1 text-sm text-muted-foreground mb-3 hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Torneios
        </Link>
        <Card className="p-10 text-center shadow-card">
          <div className="font-display text-xl mb-1">Torneio indisponível</div>
          <p className="text-sm text-muted-foreground">Esse torneio não está cadastrado.</p>
        </Card>
      </div>
    </AppLayout>
  );
}

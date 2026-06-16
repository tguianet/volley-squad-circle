import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, MapPin, Calendar, Clock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { useCurrentUser } from "@/hooks/use-auth";

type MatchPlayerStatus = Database["public"]["Enums"]["match_player_status"];

type OpenMatch = {
  id: string;
  title: string;
  modality: string;
  match_type: string;
  date: string;
  start_time: string;
  end_time: string | null;
  max_players: number;
  status: string;
  arena: { name: string; city: string | null } | null;
  players: { player_id: string; status: MatchPlayerStatus }[] | null;
};

export const Route = createFileRoute("/partidas/")({
  head: () => ({ meta: [{ title: "Partidas abertas — PlayBeach" }] }),
  component: MatchesPage,
});

const MOD_LABEL: Record<string, string> = {
  beach_volley: "Vôlei de praia",
  indoor_volley: "Vôlei indoor",
  futevolei: "Futevôlei",
};

function MatchesPage() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();

  const { data: matches = [], isLoading } = useQuery<OpenMatch[]>({
    queryKey: ["open-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          "id, title, modality, match_type, date, start_time, end_time, max_players, status, arena:arena_id(name, city), players:match_players(player_id, status)",
        )
        .in("status", ["open", "full"])
        .gte("date", new Date().toISOString().slice(0, 10))
        .order("date")
        .order("start_time");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function join(matchId: string) {
    if (!user) {
      toast.error("Faça login.");
      return;
    }
    const { error } = await supabase.from("match_players").insert({
      match_id: matchId,
      player_id: user.id,
      status: "confirmed" satisfies MatchPlayerStatus,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Você entrou na partida!");
    qc.invalidateQueries({ queryKey: ["open-matches"] });
    qc.invalidateQueries({ queryKey: ["my-matches"] });
  }

  async function leave(matchId: string) {
    if (!user) return;
    const { error } = await supabase
      .from("match_players")
      .delete()
      .eq("match_id", matchId)
      .eq("player_id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Inscrição cancelada.");
    qc.invalidateQueries({ queryKey: ["open-matches"] });
    qc.invalidateQueries({ queryKey: ["my-matches"] });
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl">Partidas abertas</h1>
            <p className="text-sm text-muted-foreground">Encontre seu próximo jogo na areia.</p>
          </div>
          <Link to="/partidas/nova">
            <Button className="gradient-beach text-white border-0 shadow-glow">
              <Plus className="size-4 mr-1" />
              Nova
            </Button>
          </Link>
        </div>

        {isLoading && (
          <Card className="p-6 text-center text-sm text-muted-foreground">Carregando…</Card>
        )}

        {!isLoading && matches.length === 0 && (
          <Card className="p-10 text-center shadow-card">
            <div className="size-14 mx-auto rounded-2xl gradient-beach flex items-center justify-center mb-4">
              <Users className="size-7 text-white" />
            </div>
            <div className="font-display text-xl mb-1">Nenhuma partida aberta</div>
            <p className="text-sm text-muted-foreground">
              Crie a primeira partida amistosa e convoque a galera.
            </p>
          </Card>
        )}

        <div className="space-y-3">
          {matches.map((m) => {
            const confirmed = (m.players ?? []).filter((p) => p.status === "confirmed").length;
            const isIn = (m.players ?? []).some((p) => p.player_id === user?.id);
            const isFull = m.status === "full" || confirmed >= m.max_players;
            return (
              <Card key={m.id} className="p-4 shadow-card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="font-display text-lg">{m.title}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {m.arena?.name ?? "Sem arena"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {m.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {m.start_time?.slice(0, 5)}
                        {m.end_time ? ` – ${m.end_time.slice(0, 5)}` : ""}
                      </span>
                    </div>
                  </div>
                  <Badge variant={isFull ? "secondary" : "default"}>
                    {isFull ? "Lotada" : "Aberta"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <Badge variant="outline">{MOD_LABEL[m.modality] ?? m.modality}</Badge>
                  <Badge variant="outline">{m.match_type}</Badge>
                  <span className="ml-auto">
                    {confirmed}/{m.max_players} vagas
                  </span>
                </div>
                {isIn ? (
                  <Button variant="outline" className="w-full" onClick={() => leave(m.id)}>
                    Cancelar inscrição
                  </Button>
                ) : (
                  <Button
                    className="w-full gradient-beach text-white border-0"
                    disabled={isFull}
                    onClick={() => join(m.id)}
                  >
                    {isFull ? "Sem vagas" : "Entrar na partida"}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

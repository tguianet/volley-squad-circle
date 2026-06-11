import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Swords } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/h2h")({
  head: () => ({ meta: [{ title: "H2H — PlayBeach" }] }),
  component: H2HPage,
});

type Player = {
  id: string;
  display_name: string;
  apelido: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
};

async function fetchPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, apelido, avatar_url, city, state")
    .order("display_name");
  if (error) throw error;
  return (data ?? []) as Player[];
}

function H2HPage() {
  const q = useQuery({ queryKey: ["h2h-players"], queryFn: fetchPlayers });
  const players = q.data ?? [];
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");

  useEffect(() => {
    if (players.length >= 2 && !a && !b) {
      setA(players[0].id);
      setB(players[1].id);
    } else if (players.length === 1 && !a) {
      setA(players[0].id);
    }
  }, [players, a, b]);

  const pA = players.find(p => p.id === a);
  const pB = players.find(p => p.id === b);
  const cityOf = (p?: Player) => p ? [p.city, p.state].filter(Boolean).join(", ") : "";

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-1">
          <Swords className="size-6 text-accent"/>
          <h1 className="text-3xl">Head to Head</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Compare jogadores no confronto direto.</p>

        {q.isLoading && <Card className="p-6 text-center text-sm text-muted-foreground">Carregando…</Card>}

        {!q.isLoading && players.length < 2 && (
          <Card className="p-10 text-center shadow-card">
            <div className="font-display text-xl mb-1">Poucos jogadores cadastrados</div>
            <p className="text-sm text-muted-foreground">
              Quando mais jogadores se cadastrarem, você poderá comparar confrontos aqui.
            </p>
          </Card>
        )}

        {pA && pB && (
          <>
            <Card className="p-6 shadow-card">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                <div className="text-center">
                  <Avatar className="size-20 mx-auto ring-4 ring-primary/40 shadow-glow mb-3">
                    <AvatarImage src={pA.avatar_url ?? undefined}/>
                    <AvatarFallback>{pA.display_name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="font-display text-lg leading-tight">{pA.display_name}</div>
                  <div className="text-xs text-muted-foreground">{cityOf(pA)}</div>
                  <Select value={a} onValueChange={setA}>
                    <SelectTrigger className="mt-3 h-9"><SelectValue/></SelectTrigger>
                    <SelectContent>{players.map(p => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="font-display text-2xl text-muted-foreground">VS</div>
                <div className="text-center">
                  <Avatar className="size-20 mx-auto ring-4 ring-accent/40 shadow-glow mb-3">
                    <AvatarImage src={pB.avatar_url ?? undefined}/>
                    <AvatarFallback>{pB.display_name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="font-display text-lg leading-tight">{pB.display_name}</div>
                  <div className="text-xs text-muted-foreground">{cityOf(pB)}</div>
                  <Select value={b} onValueChange={setB}>
                    <SelectTrigger className="mt-3 h-9"><SelectValue/></SelectTrigger>
                    <SelectContent>{players.map(p => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="mt-6 p-10 text-center shadow-card">
              <div className="font-display text-xl mb-1">Sem confrontos registrados</div>
              <p className="text-sm text-muted-foreground">
                O histórico de partidas entre estes jogadores aparecerá aqui.
              </p>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

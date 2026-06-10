import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { duplas, quartetos, getPlayer } from "@/lib/mock-data";
import type { Dupla, Quarteto, Player } from "@/lib/mock-data";
import { Swords, Flame, Trophy, ArrowUp, ArrowDown, Clock, CheckCircle2, XCircle, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/desafios/")({
  head: () => ({
    meta: [
      { title: "Desafios — BeachPlay Arena" },
      { name: "description", content: "Desafie duplas e quartetos para movimentar o ranking." },
    ],
  }),
  component: DesafiosPage,
});

type ChallengeStatus = "pendente" | "aceito" | "concluido" | "recusado";
type ChallengeType = "dupla" | "quarteto";

interface Challenge {
  id: string;
  type: ChallengeType;
  challengerId: string;
  challengedId: string;
  arena: string;
  date: string;
  time: string;
  stake: number;
  status: ChallengeStatus;
  result?: "vitoria" | "derrota";
  delta?: number;
}

interface TeamInfo {
  id: string;
  name: string;
  players: Player[];
}

function getTeam(type: ChallengeType, id: string): TeamInfo | null {
  if (type === "dupla") {
    const d: Dupla | undefined = duplas.find(x => x.id === id);
    if (!d) return null;
    const ps = [getPlayer(d.player1Id), getPlayer(d.player2Id)].filter(
      (p): p is Player => Boolean(p),
    );
    return { id: d.id, name: d.name, players: ps };
  }
  const q: Quarteto | undefined = quartetos.find(x => x.id === id);
  if (!q) return null;
  const ps = q.playerIds
    .map(pid => getPlayer(pid))
    .filter((p): p is Player => Boolean(p));
  return { id: q.id, name: q.name, players: ps };
}

function makeChallenges(): Challenge[] {
  // Desafios só podem acontecer entre equipes da MESMA categoria
  // (Masculina x Masculina, Feminina x Feminina, Mista x Mista).
  const dM = duplas.filter(d => d.gender === "M");
  const dF = duplas.filter(d => d.gender === "F");
  const dX = duplas.filter(d => d.gender === "X");
  const qM = quartetos.filter(q => q.gender === "M");
  const qF = quartetos.filter(q => q.gender === "F");
  const qX = quartetos.filter(q => q.gender === "X");
  const pick = <T extends { id: string }>(arr: T[], i: number) => arr[i % arr.length];
  const arenas = ["Arena Praia Grande", "Beach Club Norte", "Costa Verde", "Arena Sul"];

  return [
    // pendentes
    { id: "c1", type: "dupla", challengerId: pick(dM, 0).id, challengedId: pick(dM, 1).id, arena: arenas[0], date: "Dom, 14/06", time: "10:00", stake: 60, status: "pendente" },
    { id: "c2", type: "dupla", challengerId: pick(dF, 0).id, challengedId: pick(dF, 1).id, arena: arenas[1], date: "Dom, 14/06", time: "11:30", stake: 50, status: "pendente" },
    { id: "c3", type: "quarteto", challengerId: pick(qX, 0).id, challengedId: pick(qX, 1).id, arena: arenas[2], date: "Dom, 14/06", time: "14:00", stake: 90, status: "pendente" },

    // aceitos
    { id: "c4", type: "dupla", challengerId: pick(dX, 0).id, challengedId: pick(dX, 1).id, arena: arenas[3], date: "Dom, 14/06", time: "09:00", stake: 70, status: "aceito" },
    { id: "c5", type: "quarteto", challengerId: pick(qM, 0).id, challengedId: pick(qM, 1).id, arena: arenas[0], date: "Dom, 14/06", time: "15:30", stake: 100, status: "aceito" },

    // concluídos
    { id: "c6", type: "dupla", challengerId: pick(dM, 2).id, challengedId: pick(dM, 3).id, arena: arenas[1], date: "Dom, 07/06", time: "10:00", stake: 55, status: "concluido", result: "vitoria", delta: 55 },
    { id: "c7", type: "dupla", challengerId: pick(dF, 2).id, challengedId: pick(dF, 3).id, arena: arenas[2], date: "Dom, 07/06", time: "11:00", stake: 45, status: "concluido", result: "derrota", delta: -45 },
    { id: "c8", type: "quarteto", challengerId: pick(qF, 0).id, challengedId: pick(qF, 1).id, arena: arenas[3], date: "Dom, 07/06", time: "16:00", stake: 85, status: "concluido", result: "vitoria", delta: 85 },
  ];
}


function ChallengeCard({ c, onAction }: { c: Challenge; onAction: (id: string, action: "aceitar" | "recusar") => void }) {
  const a = getTeam(c.type, c.challengerId);
  const b = getTeam(c.type, c.challengedId);
  if (!a || !b) return null;

  // Trava: desafio só entre equipes da mesma categoria.
  const teamGender = c.type === "dupla"
    ? duplas.find(d => d.id === c.challengerId)?.gender
    : quartetos.find(q => q.id === c.challengerId)?.gender;
  const oppGender = c.type === "dupla"
    ? duplas.find(d => d.id === c.challengedId)?.gender
    : quartetos.find(q => q.id === c.challengedId)?.gender;
  if (!teamGender || teamGender !== oppGender) return null;

  const catLabel = teamGender === "M" ? "Masculino" : teamGender === "F" ? "Feminino" : "Misto";
  const typeLabel = c.type === "dupla" ? "Dupla" : "Quarteto";

  return (
    <Card className="p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <Badge variant="secondary" className="gap-1">
          <Swords className="size-3" />
          {typeLabel} • {catLabel}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" /> {c.date} • {c.time}
        </div>
      </div>



      <div className="flex items-center gap-3">
        <div className="flex-1 text-center">
          <div className="flex -space-x-3 justify-center mb-1">
            {a.players.map(p => (
              <Avatar key={p.id} className="size-10 ring-2 ring-background">
                <AvatarImage src={p.avatar} />
                <AvatarFallback>{p.name[0]}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <div className="text-sm font-semibold truncate">{a.name}</div>
        </div>

        <div className="flex flex-col items-center px-2">
          <div className="font-display text-xs text-muted-foreground">VS</div>
          <div className="mt-1 px-2 py-0.5 rounded-full gradient-beach text-white text-[10px] font-semibold flex items-center gap-1">
            <Flame className="size-3" /> {c.stake} pts
          </div>
        </div>

        <div className="flex-1 text-center">
          <div className="flex -space-x-3 justify-center mb-1">
            {b.players.map(p => (
              <Avatar key={p.id} className="size-10 ring-2 ring-background">
                <AvatarImage src={p.avatar} />
                <AvatarFallback>{p.name[0]}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <div className="text-sm font-semibold truncate">{b.name}</div>
        </div>
      </div>

      <div className="mt-3 text-xs text-muted-foreground text-center">{c.arena}</div>

      {c.status === "pendente" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={() => onAction(c.id, "recusar")}>
            <XCircle className="size-4" /> Recusar
          </Button>
          <Button size="sm" className="gradient-beach text-white" onClick={() => onAction(c.id, "aceitar")}>
            <CheckCircle2 className="size-4" /> Aceitar
          </Button>
        </div>
      )}

      {c.status === "aceito" && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-success">
          <CheckCircle2 className="size-4" /> Confirmado — aguardando partida
        </div>
      )}

      {c.status === "concluido" && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          {c.result === "vitoria" ? (
            <span className="flex items-center gap-1 text-success font-semibold">
              <ArrowUp className="size-4" /> +{c.delta} pts no ranking
            </span>
          ) : (
            <span className="flex items-center gap-1 text-destructive font-semibold">
              <ArrowDown className="size-4" /> {c.delta} pts no ranking
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

function DesafiosPage() {
  const [list, setList] = useState<Challenge[]>(() => makeChallenges());

  const pendentes = useMemo(() => list.filter(c => c.status === "pendente"), [list]);
  const aceitos = useMemo(() => list.filter(c => c.status === "aceito"), [list]);
  const concluidos = useMemo(() => list.filter(c => c.status === "concluido"), [list]);

  const totalDelta = concluidos.reduce((s, c) => s + (c.delta ?? 0), 0);

  const handleAction = (id: string, action: "aceitar" | "recusar") => {
    setList(prev => prev.map(c => c.id === id ? { ...c, status: action === "aceitar" ? "aceito" : "recusado" } : c));
    toast.success(action === "aceitar" ? "Desafio aceito!" : "Desafio recusado");
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl flex items-center gap-2">
              <Swords className="size-7 text-primary" /> Desafios
            </h1>
            <p className="text-sm text-muted-foreground">Apenas Duplas e Quartetos. O Individual é apenas ranking agregado.</p>
          </div>
          <Button className="gradient-beach text-white shadow-glow shrink-0">
            <Plus className="size-4" /> Novo desafio
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 my-5">
          <Card className="p-3 text-center">
            <div className="font-display text-2xl text-primary">{pendentes.length}</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Pendentes</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="font-display text-2xl text-accent-foreground">{aceitos.length}</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Aceitos</div>
          </Card>
          <Card className="p-3 text-center">
            <div className={`font-display text-2xl ${totalDelta >= 0 ? "text-success" : "text-destructive"}`}>
              {totalDelta >= 0 ? "+" : ""}{totalDelta}
            </div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Pts no ranking</div>
          </Card>
        </div>

        <Card className="p-4 mb-5 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl gradient-beach flex items-center justify-center shadow-glow">
              <Trophy className="size-5 text-white" />
            </div>
            <div className="text-xs">
              <div className="font-semibold text-sm">Como funciona</div>
              <p className="text-muted-foreground">Desafios acontecem apenas em Duplas e Quartetos. Os pontos da equipe vencedora também são somados ao Ranking Individual de cada jogador participante.</p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="pendentes">
          <TabsList className="bg-secondary">
            <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
            <TabsTrigger value="aceitos">Aceitos ({aceitos.length})</TabsTrigger>
            <TabsTrigger value="concluidos">Concluídos ({concluidos.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes" className="mt-4 space-y-3">
            {pendentes.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum desafio pendente.</p>}
            {pendentes.map(c => <ChallengeCard key={c.id} c={c} onAction={handleAction} />)}
          </TabsContent>

          <TabsContent value="aceitos" className="mt-4 space-y-3">
            {aceitos.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum desafio aceito.</p>}
            {aceitos.map(c => <ChallengeCard key={c.id} c={c} onAction={handleAction} />)}
          </TabsContent>

          <TabsContent value="concluidos" className="mt-4 space-y-3">
            {concluidos.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum desafio concluído.</p>}
            {concluidos.map(c => <ChallengeCard key={c.id} c={c} onAction={handleAction} />)}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

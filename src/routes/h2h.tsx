import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { players } from "@/lib/mock-data";
import { useState } from "react";
import { Swords } from "lucide-react";

export const Route = createFileRoute("/h2h")({
  head: () => ({ meta: [{ title: "H2H — BeachPlay Arena" }] }),
  component: H2HPage,
});

const mockH2H = {
  total: 12,
  winsA: 7,
  winsB: 5,
  matches: [
    { date: "08/06/26", score: "21-18 / 21-17", winner: "A" },
    { date: "22/05/26", score: "19-21 / 18-21", winner: "B" },
    { date: "10/05/26", score: "21-19 / 17-21 / 15-12", winner: "A" },
    { date: "27/04/26", score: "21-15 / 21-13", winner: "A" },
    { date: "14/04/26", score: "18-21 / 21-19 / 11-15", winner: "B" },
  ],
};

function H2HPage() {
  const [a, setA] = useState(players[0].id);
  const [b, setB] = useState(players[1].id);
  const pA = players.find(p => p.id === a)!;
  const pB = players.find(p => p.id === b)!;
  const pct = (mockH2H.winsA / mockH2H.total) * 100;
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-1">
          <Swords className="size-6 text-accent"/>
          <h1 className="text-3xl">Head to Head</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Compare jogadores e duplas no confronto direto.</p>

        <Card className="p-6 shadow-card">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
            <div className="text-center">
              <Avatar className="size-20 mx-auto ring-4 ring-primary/40 shadow-glow mb-3"><AvatarImage src={pA.avatar}/><AvatarFallback>{pA.name[0]}</AvatarFallback></Avatar>
              <div className="font-display text-lg leading-tight">{pA.name}</div>
              <div className="text-xs text-muted-foreground">{pA.city}</div>
              <Select value={a} onValueChange={setA}>
                <SelectTrigger className="mt-3 h-9"><SelectValue/></SelectTrigger>
                <SelectContent>{players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="font-display text-2xl text-muted-foreground">VS</div>
            <div className="text-center">
              <Avatar className="size-20 mx-auto ring-4 ring-accent/40 shadow-glow mb-3"><AvatarImage src={pB.avatar}/><AvatarFallback>{pB.name[0]}</AvatarFallback></Avatar>
              <div className="font-display text-lg leading-tight">{pB.name}</div>
              <div className="text-xs text-muted-foreground">{pB.city}</div>
              <Select value={b} onValueChange={setB}>
                <SelectTrigger className="mt-3 h-9"><SelectValue/></SelectTrigger>
                <SelectContent>{players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-display text-2xl text-primary">{mockH2H.winsA}</span>
              <span className="text-xs text-muted-foreground self-center">{mockH2H.total} confrontos</span>
              <span className="font-display text-2xl text-accent">{mockH2H.winsB}</span>
            </div>
            <div className="h-3 rounded-full bg-secondary overflow-hidden flex">
              <div className="bg-primary" style={{ width: `${pct}%` }}/>
              <div className="bg-accent flex-1"/>
            </div>
          </div>
        </Card>

        <h2 className="text-xl mt-8 mb-3">Últimos confrontos</h2>
        <Card className="shadow-card divide-y">
          {mockH2H.matches.map((m, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="text-xs text-muted-foreground w-20">{m.date}</div>
              <div className="flex-1 text-sm font-mono tabular-nums">{m.score}</div>
              <div className={`text-xs font-bold px-2.5 py-1 rounded-md ${m.winner === "A" ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"}`}>
                {m.winner === "A" ? pA.name.split(" ")[0] : pB.name.split(" ")[0]}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </AppLayout>
  );
}

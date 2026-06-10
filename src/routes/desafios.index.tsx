import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { duplas, quartetos, getPlayer } from "@/lib/mock-data";
import type { Dupla, Quarteto, Player } from "@/lib/mock-data";
import { Swords, Flame, Trophy, ArrowUp, ArrowDown, Clock, CheckCircle2, XCircle, Plus, CalendarIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";


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
  court: number; // 1..7
  date: string;
  time: string;
  stake: number;
  status: ChallengeStatus;
  result?: "vitoria" | "derrota";
  delta?: number;
}

const COURTS = [1, 2, 3, 4, 5, 6, 7];
const TIME_SLOTS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];

// Ocupação determinística (mock da agenda) — algumas quadras já estão reservadas
// por jogos do ranking. Combina com desafios já criados.
function preBookedCourts(arena: string, date: string, time: string): number[] {
  let h = 0;
  const s = `${arena}|${date}|${time}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const a = (h % 7) + 1;
  const b = ((h >> 3) % 7) + 1;
  const c = ((h >> 6) % 7) + 1;
  return Array.from(new Set([a, b, c]));
}

// Regras de pontuação do ranking:
// - Vitória contra equipe ACIMA: 1 pos=+20, 2=+30, 3=+40, 4+=+50
// - Vitória contra equipe ABAIXO: 1 pos=+10, 2+ pos=+5
// - Derrota: perde metade do que o vencedor ganharia (arredondado p/ cima)
// - Bônus de atividade já incluso: +5 partida registrada + +15 vitória
function computeStakes(challengerIdx: number, challengedIdx: number): { win: number; loss: number } {
  if (challengerIdx < 0 || challengedIdx < 0) return { win: 0, loss: 0 };
  const diff = challengerIdx - challengedIdx; // >0 = adversário está acima
  let base: number;
  if (diff > 0) {
    base = diff === 1 ? 20 : diff === 2 ? 30 : diff === 3 ? 40 : 50;
  } else {
    const d = Math.abs(diff);
    base = d === 1 ? 10 : 5;
  }
  const win = base + 15 + 5; // base + vitória + partida registrada
  const loss = -(Math.ceil(base / 2) - 5); // perde metade do base, mas ainda ganha +5 por registrar
  return { win, loss };
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
    { id: "c1", type: "dupla", challengerId: pick(dM, 0).id, challengedId: pick(dM, 1).id, arena: arenas[0], court: 1, date: "Dom, 14/06", time: "10:00", stake: 60, status: "pendente" },
    { id: "c2", type: "dupla", challengerId: pick(dF, 0).id, challengedId: pick(dF, 1).id, arena: arenas[1], court: 2, date: "Dom, 14/06", time: "11:00", stake: 50, status: "pendente" },
    { id: "c3", type: "quarteto", challengerId: pick(qX, 0).id, challengedId: pick(qX, 1).id, arena: arenas[2], court: 4, date: "Dom, 14/06", time: "14:00", stake: 90, status: "pendente" },

    // aceitos
    { id: "c4", type: "dupla", challengerId: pick(dX, 0).id, challengedId: pick(dX, 1).id, arena: arenas[3], court: 3, date: "Dom, 14/06", time: "09:00", stake: 70, status: "aceito" },
    { id: "c5", type: "quarteto", challengerId: pick(qM, 0).id, challengedId: pick(qM, 1).id, arena: arenas[0], court: 5, date: "Dom, 14/06", time: "15:00", stake: 100, status: "aceito" },

    // concluídos
    { id: "c6", type: "dupla", challengerId: pick(dM, 2).id, challengedId: pick(dM, 3).id, arena: arenas[1], court: 1, date: "Dom, 07/06", time: "10:00", stake: 55, status: "concluido", result: "vitoria", delta: 55 },
    { id: "c7", type: "dupla", challengerId: pick(dF, 2).id, challengedId: pick(dF, 3).id, arena: arenas[2], court: 2, date: "Dom, 07/06", time: "11:00", stake: 45, status: "concluido", result: "derrota", delta: -45 },
    { id: "c8", type: "quarteto", challengerId: pick(qF, 0).id, challengedId: pick(qF, 1).id, arena: arenas[3], court: 6, date: "Dom, 07/06", time: "16:00", stake: 85, status: "concluido", result: "vitoria", delta: 85 },
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

      <div className="mt-3 text-xs text-muted-foreground text-center">{c.arena} • Quadra {c.court}</div>

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
  const [open, setOpen] = useState(false);

  // Form state
  const [fType, setFType] = useState<ChallengeType>("dupla");
  const [fCategory, setFCategory] = useState<"M" | "F" | "X">("M");
  const [fChallenger, setFChallenger] = useState<string>("");
  const [fChallenged, setFChallenged] = useState<string>("");
  const [fArena, setFArena] = useState<string>("Arena Praia Grande");
  const [fDate, setFDate] = useState<string>("");
  const [fTime, setFTime] = useState<string>("10:00");
  // fStake removido — agora calculado automaticamente via `stakes`.
  const [fCourt, setFCourt] = useState<number | null>(null);

  const teamsInCategory = useMemo(() => {
    const source = fType === "dupla" ? duplas : quartetos;
    return source
      .filter(t => t.gender === fCategory)
      .slice()
      .sort((a, b) => b.rankingPoints - a.rankingPoints);
  }, [fType, fCategory]);

  // Pode desafiar até 4 posições acima e 2 posições abaixo no ranking.
  const opponentOptions = useMemo(() => {
    if (!fChallenger) return [];
    const idx = teamsInCategory.findIndex(t => t.id === fChallenger);
    if (idx === -1) return [];
    const min = Math.max(0, idx - 4);
    const max = Math.min(teamsInCategory.length - 1, idx + 2);
    return teamsInCategory
      .slice(min, max + 1)
      .filter(t => t.id !== fChallenger);
  }, [teamsInCategory, fChallenger]);

  // Pontos em jogo calculados a partir das posições no ranking.
  const stakes = useMemo(() => {
    if (!fChallenger || !fChallenged) return { win: 0, loss: 0 };
    const ci = teamsInCategory.findIndex(t => t.id === fChallenger);
    const oi = teamsInCategory.findIndex(t => t.id === fChallenged);
    return computeStakes(ci, oi);
  }, [teamsInCategory, fChallenger, fChallenged]);


  // Disponibilidade de quadras na agenda para o slot escolhido.
  const formattedDate = useMemo(
    () => fDate ? new Date(fDate).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }) : "",
    [fDate],
  );

  const occupiedCourts = useMemo(() => {
    if (!fDate || !fTime) return new Set<number>();
    const pre = preBookedCourts(fArena, formattedDate, fTime);
    const fromList = list
      .filter(c => c.arena === fArena && c.date === formattedDate && c.time === fTime && c.status !== "recusado")
      .map(c => c.court);
    return new Set<number>([...pre, ...fromList]);
  }, [fArena, formattedDate, fTime, fDate, list]);

  const resetForm = () => {
    setFType("dupla");
    setFCategory("M");
    setFChallenger("");
    setFChallenged("");
    setFArena("Arena Praia Grande");
    setFDate("");
    setFTime("10:00");
    setFCourt(null);
    setFCourt(null);
  };

  const handleCreate = () => {
    if (!fChallenger || !fChallenged) {
      toast.error("Selecione as duas equipes.");
      return;
    }
    if (fChallenger === fChallenged) {
      toast.error("As equipes devem ser diferentes.");
      return;
    }
    if (!fDate) {
      toast.error("Escolha uma data.");
      return;
    }
    if (fCourt === null) {
      toast.error("Selecione uma quadra disponível.");
      return;
    }
    if (occupiedCourts.has(fCourt)) {
      toast.error("Esta quadra já está ocupada neste horário.");
      return;
    }
    const newChallenge: Challenge = {
      id: `c${Date.now()}`,
      type: fType,
      challengerId: fChallenger,
      challengedId: fChallenged,
      arena: fArena,
      court: fCourt,
      date: formattedDate,
      time: fTime,
      stake: fStake,
      status: "pendente",
    };
    setList(prev => [newChallenge, ...prev]);
    toast.success(`Desafio criado na Quadra ${fCourt}!`);
    setOpen(false);
    resetForm();
  };


  const pendentes = useMemo(() => list.filter(c => c.status === "pendente"), [list]);
  const aceitos = useMemo(() => list.filter(c => c.status === "aceito"), [list]);
  const concluidos = useMemo(() => list.filter(c => c.status === "concluido"), [list]);

  const totalDelta = concluidos.reduce((s, c) => s + (c.delta ?? 0), 0);

  const handleAction = (id: string, action: "aceitar" | "recusar") => {
    setList(prev => prev.map(c => c.id === id ? { ...c, status: action === "aceitar" ? "aceito" : "recusado" } : c));
    toast.success(action === "aceitar" ? "Desafio aceito!" : "Desafio recusado");
  };

  const arenaOptions = ["Arena Praia Grande", "Beach Club Norte", "Costa Verde", "Arena Sul"];

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
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-beach text-white shadow-glow shrink-0">
                <Plus className="size-4" /> Novo desafio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Novo desafio</DialogTitle>
                <DialogDescription>Equipes da mesma categoria. Mistas só desafiam Mistas.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Modalidade</Label>
                    <Select value={fType} onValueChange={(v) => { setFType(v as ChallengeType); setFChallenger(""); setFChallenged(""); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dupla">Dupla</SelectItem>
                        <SelectItem value="quarteto">Quarteto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Categoria</Label>
                    <Select value={fCategory} onValueChange={(v) => { setFCategory(v as "M" | "F" | "X"); setFChallenger(""); setFChallenged(""); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Feminino</SelectItem>
                        <SelectItem value="X">Misto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Sua equipe</Label>
                  <Select value={fChallenger} onValueChange={(v) => { setFChallenger(v); if (v === fChallenged) setFChallenged(""); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {teamsInCategory.map((t, i) => (
                        <SelectItem key={t.id} value={t.id}>
                          #{i + 1} — {t.name} ({t.rankingPoints} pts)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Equipe adversária</Label>
                  <Select value={fChallenged} onValueChange={setFChallenged} disabled={!fChallenger}>
                    <SelectTrigger><SelectValue placeholder={fChallenger ? "Selecione..." : "Escolha sua equipe primeiro"} /></SelectTrigger>
                    <SelectContent>
                      {opponentOptions.length === 0 && fChallenger && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma equipe no intervalo permitido.</div>
                      )}
                      {opponentOptions.map(t => {
                        const rank = teamsInCategory.findIndex(x => x.id === t.id) + 1;
                        return (
                          <SelectItem key={t.id} value={t.id}>
                            #{rank} — {t.name} ({t.rankingPoints} pts)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {fChallenger && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Pode desafiar até 4 posições acima e 2 abaixo da sua no ranking.
                    </p>
                  )}
                </div>


                <div>
                  <Label className="text-xs">Arena</Label>
                  <Select value={fArena} onValueChange={(v) => { setFArena(v); setFCourt(null); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {arenaOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Data</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal text-xs", !fDate && "text-muted-foreground")}
                        >
                          <CalendarIcon className="size-3 mr-2" />
                          {fDate ? format(new Date(fDate + "T00:00:00"), "dd/MM/yyyy") : <span>Domingo...</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={fDate ? new Date(fDate + "T00:00:00") : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setFDate(format(date, "yyyy-MM-dd"));
                              setFCourt(null);
                            }
                          }}
                          disabled={(date) => date.getDay() !== 0}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-xs">Hora</Label>
                    <Select value={fTime} onValueChange={(v) => { setFTime(v); setFCourt(null); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Pts em jogo</Label>
                    <Input type="number" min={10} max={200} value={fStake} onChange={(e) => setFStake(Number(e.target.value))} />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Quadras disponíveis</Label>
                  {!fDate ? (
                    <p className="text-[11px] text-muted-foreground mt-1">Escolha data e hora para ver a agenda.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-7 gap-1.5 mt-1">
                        {COURTS.map(n => {
                          const busy = occupiedCourts.has(n);
                          const selected = fCourt === n;
                          return (
                            <button
                              key={n}
                              type="button"
                              disabled={busy}
                              onClick={() => setFCourt(n)}
                              className={`h-12 rounded-md text-xs font-semibold flex flex-col items-center justify-center transition-all border ${
                                busy
                                  ? "bg-destructive/10 text-destructive/60 border-destructive/20 cursor-not-allowed line-through"
                                  : selected
                                  ? "gradient-beach text-white border-transparent shadow-glow"
                                  : "bg-success/10 text-success border-success/30 hover:bg-success/20"
                              }`}
                            >
                              <span>Q{n}</span>
                              <span className="text-[9px] font-normal opacity-80">{busy ? "ocupada" : "livre"}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {fArena} • {formattedDate} • {fTime}
                      </p>
                    </>
                  )}
                </div>

              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button className="gradient-beach text-white" onClick={handleCreate}>Criar desafio</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

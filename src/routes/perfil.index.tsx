import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { currentUser, duplas, getPlayer, players, recentMatches } from "@/lib/mock-data";
import { formatDateBR } from "@/lib/date-format";
import { MapPin, Ruler, Hand, ArrowLeftRight, Trophy, Settings, Target, Users, Crown, Send, Check, X, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const POSITIONS = ["Entrada de rede", "Saída de rede", "Defesa", "Rede"] as const;
type Position = typeof POSITIONS[number];
import { ProfileGallery } from "@/components/profile-gallery";
import { ProfileBanner } from "@/components/profile-banner";
import { ProfileAvatar } from "@/components/profile-avatar";

const TEAM_FORMATS = ["Dupla", "Dupla mista", "Quarteto", "Quarteto misto"] as const;
type TeamFormat = typeof TEAM_FORMATS[number];

type Invite = { playerId: string; status: "pending" | "accepted" | "declined" };
type Team = { id: string; name: string; format: TeamFormat; captainId: string; invites: Invite[]; createdAt: string };

export const Route = createFileRoute("/perfil/")({
  head: () => ({ meta: [{ title: "Perfil — BeachPlay Arena" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const [p, setP] = useState(currentUser);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: p.name, username: p.username, bio: p.bio, city: p.city, height: p.height, position: "Entrada de rede" as Position });
  const dupla = duplas.find(d => d.player1Id === p.id || d.player2Id === p.id);
  const partner = dupla ? getPlayer(dupla.player1Id === p.id ? dupla.player2Id : dupla.player1Id) : null;
  const winRate = ((p.wins / p.matches) * 100).toFixed(0);
  const onSave = () => {
    setP({ ...p, ...form, height: Number(form.height) });
    setOpen(false);
    toast.success("Perfil atualizado");
  };
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <Card className="overflow-hidden shadow-card">
          <div className="relative">
            <ProfileBanner />
            <div className="absolute -bottom-12 left-6 z-10">
              <ProfileAvatar fallback={p.name[0]} className="size-24 ring-4 ring-background shadow-glow" />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary" className="absolute top-3 right-3 z-10"><Settings className="size-4 mr-1"/>Editar</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Editar perfil</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Foto do perfil</Label>
                    <ProfileAvatar fallback={p.name[0]} className="size-20" editable />
                  </div>
                  <div className="space-y-1.5"><Label htmlFor="ed-name">Nome</Label><Input id="ed-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></div>
                  <div className="space-y-1.5"><Label htmlFor="ed-user">Usuário</Label><Input id="ed-user" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}/></div>
                  <div className="space-y-1.5"><Label htmlFor="ed-city">Cidade</Label><Input id="ed-city" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}/></div>
                  <div className="space-y-1.5"><Label htmlFor="ed-height">Altura (cm)</Label><Input id="ed-height" type="number" value={form.height} onChange={e => setForm({ ...form, height: Number(e.target.value) })}/></div>
                  <div className="space-y-1.5">
                    <Label>Posição que joga</Label>
                    <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v as Position })}>
                      <SelectTrigger><SelectValue placeholder="Selecione a posição" /></SelectTrigger>
                      <SelectContent>
                        {POSITIONS.map((pos) => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label htmlFor="ed-bio">Bio</Label><Textarea id="ed-bio" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}/></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={onSave}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="pt-16 px-6 pb-6">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <h1 className="font-display text-3xl leading-none">{p.name}</h1>
                <div className="text-sm text-muted-foreground">{p.username}</div>
              </div>
              <Badge className="gradient-beach text-white border-0 ml-auto">{p.level}</Badge>
            </div>
            <p className="text-sm mt-3">{p.bio}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-xs">
              <Info icon={MapPin} label="Cidade" value={p.city}/>
              <Info icon={Ruler} label="Altura" value={`${p.height} cm`}/>
              <Info icon={Hand} label="Mão" value={p.dominantHand}/>
              <Info icon={ArrowLeftRight} label="Lado" value={p.preferredSide}/>
              <Info icon={Target} label="Posição" value={(p as any).position ?? form.position}/>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Ranking" value={p.rankingPoints} sub={`#${1}`} accent/>
          <Stat label="Vitórias" value={p.wins} sub={`${winRate}% apr.`}/>
          <Stat label="Derrotas" value={p.losses}/>
          <Stat label="MVPs" value={p.mvps} sub={`${p.matches} jogos`}/>
        </div>

        {/* Dupla */}
        {dupla && partner && (
          <Card className="p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg">Dupla fixa</h2>
              <Badge variant="secondary">#{1} ranking</Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                <Avatar className="size-12 ring-2 ring-background"><AvatarImage src={p.avatar}/></Avatar>
                <Avatar className="size-12 ring-2 ring-background"><AvatarImage src={partner.avatar}/></Avatar>
              </div>
              <div className="flex-1">
                <div className="font-display text-xl">{dupla.name}</div>
                <div className="text-xs text-muted-foreground">Desde {formatDateBR(dupla.formedAt)}</div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div><div className="font-display text-lg text-success">{dupla.wins}</div><div className="text-muted-foreground">V</div></div>
                <div><div className="font-display text-lg text-destructive">{dupla.losses}</div><div className="text-muted-foreground">D</div></div>
                <div><div className="font-display text-lg text-primary">{dupla.rankingPoints}</div><div className="text-muted-foreground">pts</div></div>
              </div>
            </div>
          </Card>
        )}

        {/* Montar time */}
        <TeamBuilder currentId={p.id} />

        {/* Galeria de fotos */}
        <ProfileGallery />


        {/* Histórico */}
        <Card className="p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg">Histórico recente</h2>
            <Link to="/h2h" className="text-xs text-primary font-semibold">Comparar H2H →</Link>
          </div>
          <div className="space-y-2">
            {recentMatches.map(m => (
              <div key={m.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div className={`size-8 rounded-lg flex items-center justify-center font-display text-sm ${m.result === "V" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>{m.result}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium">vs {m.opponent}</div>
                  <div className="text-xs text-muted-foreground">{m.date}</div>
                </div>
                <div className="text-xs font-mono tabular-nums text-muted-foreground">{m.score}</div>
              </div>
            ))}
          </div>
        </Card>

        <Link to="/auth"><Button variant="outline" className="w-full">Sair</Button></Link>
      </div>
    </AppLayout>
  );
}

function Info({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/60">
      <Icon className="size-4 text-primary shrink-0"/>
      <div className="min-w-0">
        <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
        <div className="text-sm font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: boolean }) {
  return (
    <Card className={`p-4 shadow-card ${accent ? "gradient-beach text-white" : ""}`}>
      <div className={`text-xs uppercase tracking-wide ${accent ? "opacity-80" : "text-muted-foreground"}`}>{label}</div>
      <div className="font-display text-3xl leading-none mt-1">{value}</div>
      {sub && <div className={`text-[10px] mt-1 ${accent ? "opacity-80" : "text-muted-foreground"}`}>{sub}</div>}
    </Card>
  );
}

function TeamBuilder({ currentId }: { currentId: string }) {
  const others = players.filter(pl => pl.id !== currentId);
  const [teams, setTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string>(currentId);

  const reset = () => { setName(""); setSelected([]); setCaptainId(currentId); };

  const toggle = (id: string) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const create = () => {
    if (!name.trim()) return toast.error("Dê um nome ao time");
    if (selected.length === 0) return toast.error("Selecione ao menos um participante");
    const eligible = [currentId, ...selected];
    if (!eligible.includes(captainId)) return toast.error("Escolha um capitão dentre os membros");
    const team: Team = {
      id: `t${Date.now()}`,
      name: name.trim(),
      captainId,
      invites: selected.map(pid => ({ playerId: pid, status: "pending" })),
      createdAt: new Date().toISOString(),
    };
    setTeams(t => [team, ...t]);
    setOpen(false);
    reset();
    toast.success(`Convites enviados para ${selected.length} jogador(es)`);
  };

  const respond = (teamId: string, playerId: string, status: "accepted" | "declined") => {
    setTeams(ts => ts.map(t => {
      if (t.id !== teamId) return t;
      const next = { ...t, invites: t.invites.map(i => i.playerId === playerId ? { ...i, status } : i) };
      const allAccepted = next.invites.every(i => i.status === "accepted");
      if (status === "accepted" && allAccepted) {
        toast.success(`${next.name} entrou no ranking! 🏆`);
      }
      return next;
    }));
  };

  const remove = (teamId: string) => {
    setTeams(ts => ts.filter(t => t.id !== teamId));
    toast.success("Time removido");
  };

  return (
    <Card className="p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-primary" />
          <h2 className="text-lg">Meus times</h2>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-beach text-white border-0"><Plus className="size-4 mr-1"/>Montar time</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Montar novo time</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="team-name">Nome do time</Label>
                <Input id="team-name" placeholder="Ex: Tubarões da Areia" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Participantes</Label>
                <div className="space-y-1 max-h-64 overflow-y-auto rounded-md border p-2">
                  {others.map(pl => (
                    <label key={pl.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/60 cursor-pointer">
                      <Checkbox checked={selected.includes(pl.id)} onCheckedChange={() => toggle(pl.id)} />
                      <Avatar className="size-8"><AvatarImage src={pl.avatar}/><AvatarFallback>{pl.name[0]}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{pl.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{pl.username}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Capitão</Label>
                <Select value={captainId} onValueChange={setCaptainId}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={currentId}>Eu (capitão)</SelectItem>
                    {selected.map(id => {
                      const pl = getPlayer(id);
                      return pl ? <SelectItem key={id} value={id}>{pl.name}</SelectItem> : null;
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={create}><Send className="size-4 mr-1"/>Enviar convites</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Você ainda não montou nenhum time. Clique em <strong>Montar time</strong> para começar.
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map(t => {
            const accepted = t.invites.filter(i => i.status === "accepted").length;
            const allIn = t.invites.length > 0 && accepted === t.invites.length;
            return (
              <div key={t.id} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-display text-base">{t.name}</div>
                      {allIn && <Badge className="gradient-beach text-white border-0 text-[10px]">No ranking</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{accepted}/{t.invites.length} confirmados</div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="size-4"/></Button>
                </div>
                <div className="space-y-1.5">
                  {t.invites.map(inv => {
                    const pl = getPlayer(inv.playerId);
                    if (!pl) return null;
                    const isCaptain = t.captainId === pl.id;
                    return (
                      <div key={inv.playerId} className="flex items-center gap-2 p-2 rounded-md bg-secondary/40">
                        <Avatar className="size-7"><AvatarImage src={pl.avatar}/><AvatarFallback>{pl.name[0]}</AvatarFallback></Avatar>
                        <div className="flex-1 text-sm flex items-center gap-1.5">
                          {pl.name}
                          {isCaptain && <Crown className="size-3.5 text-primary" />}
                        </div>
                        {inv.status === "pending" && (
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-[10px]">Pendente</Badge>
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => respond(t.id, inv.playerId, "accepted")}><Check className="size-3.5 text-success"/></Button>
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => respond(t.id, inv.playerId, "declined")}><X className="size-3.5 text-destructive"/></Button>
                          </div>
                        )}
                        {inv.status === "accepted" && <Badge className="bg-success/20 text-success border-0 text-[10px]">Aceitou</Badge>}
                        {inv.status === "declined" && <Badge variant="destructive" className="text-[10px]">Recusou</Badge>}
                      </div>
                    );
                  })}
                  {t.captainId === currentId && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-primary/10">
                      <Crown className="size-4 text-primary" />
                      <div className="flex-1 text-sm">Você é o capitão</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

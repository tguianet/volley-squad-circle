import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { getPlayer, players, recentMatches } from "@/lib/mock-data";
import { MapPin, Ruler, Hand, Instagram, MessageCircle, Settings, Target, Users, Crown, Send, Check, X, Plus, Trash2, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProfileGallery } from "@/components/profile-gallery";
import { ProfileBanner } from "@/components/profile-banner";
import { ProfileAvatar } from "@/components/profile-avatar";

const TEAM_FORMATS = ["Dupla", "Dupla mista", "Quarteto", "Quarteto misto"] as const;
type TeamFormat = typeof TEAM_FORMATS[number];

type Invite = { playerId: string; status: "pending" | "accepted" | "declined" };
type Team = { id: string; name: string; format: TeamFormat; captainId: string; invites: Invite[]; createdAt: string };

export const Route = createFileRoute("/perfil/")({
  head: () => ({ meta: [{ title: "Perfil — PlayBeach" }] }),
  component: ProfilePage,
});

type MyProfile = {
  id: string;
  email: string | null;
  google_name: string | null;
  google_picture: string | null;
  display_name: string | null;
  username: string | null;
  apelido: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  whatsapp: string | null;
  instagram: string | null;
  posicao_principal: string | null;
  level: string | null;
  mao_dominante: string | null;
  altura: number | null;
  avatar_url: string | null;
  banner_url: string | null;
  pontos: number | null;
  vitorias: number | null;
  derrotas: number | null;
};

async function fetchMyProfile(): Promise<MyProfile | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, apelido, bio, city, state, whatsapp, instagram, posicao_principal, level, mao_dominante, altura, avatar_url, banner_url, pontos, vitorias, derrotas")
    .eq("id", u.user.id)
    .maybeSingle();
  if (error) throw error;
  const meta = (u.user.user_metadata ?? {}) as Record<string, any>;
  return {
    id: u.user.id,
    email: u.user.email ?? null,
    google_name: meta.full_name ?? meta.name ?? null,
    google_picture: meta.avatar_url ?? meta.picture ?? null,
    ...(data ?? {
      display_name: null, username: null, apelido: null, bio: null, city: null, state: null,
      whatsapp: null, instagram: null, posicao_principal: null, level: null, mao_dominante: null,
      altura: null, avatar_url: null, banner_url: null, pontos: 0, vitorias: 0, derrotas: 0,
    }),
  } as MyProfile;
}

function ProfilePage() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ["my-profile"], queryFn: fetchMyProfile });

  const emailHandle = profile?.email?.split("@")[0] ?? "";
  const displayName = profile?.display_name || profile?.google_name || emailHandle || "Jogador";
  const username = profile?.apelido || profile?.username || emailHandle || "jogador";
  const city = profile?.city || "Não informado";
  const state = profile?.state || "";
  const cityState = state ? `${city}, ${state}` : city;
  const bio = profile?.bio || "";
  const matches = (profile?.vitorias ?? 0) + (profile?.derrotas ?? 0);
  const winRate = matches > 0 ? ((profile?.vitorias ?? 0) / matches * 100).toFixed(0) : "0";

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    apelido: "", bio: "", city: "", state: "", whatsapp: "", instagram: "",
    posicao_principal: "", level: "", mao_dominante: "", altura: "",
  });
  const [saving, setSaving] = useState(false);

  // Initialize form when the modal opens — avoid overwriting user edits on background refetch
  useEffect(() => {
    if (!open || !profile) return;
    setForm({
      apelido: profile.apelido ?? profile.username ?? "",
      bio: profile.bio ?? "",
      city: profile.city ?? "",
      state: profile.state ?? "",
      whatsapp: profile.whatsapp ?? "",
      instagram: profile.instagram ?? "",
      posicao_principal: profile.posicao_principal ?? "",
      level: profile.level ?? "",
      mao_dominante: profile.mao_dominante ?? "",
      altura: profile.altura ? String(profile.altura) : "",
    });
  }, [open, profile?.id]);

  const onSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const payload = {
        apelido: form.apelido.trim() || null,
        bio: form.bio.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        instagram: form.instagram.trim() || null,
        posicao_principal: form.posicao_principal || null,
        level: form.level || null,
        mao_dominante: form.mao_dominante || null,
        altura: form.altura ? Number(form.altura) : null,
      };
      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", profile.id)
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("Nenhuma linha foi atualizada. Verifique permissões.");
      // Update cache immediately so UI reflects without waiting on refetch
      qc.setQueryData(["my-profile"], (prev: any) => prev ? { ...prev, ...payload } : prev);
      toast.success("Perfil atualizado");
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-12 flex justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const fallbackInitial = (displayName[0] ?? "?").toUpperCase();

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <Card className="overflow-hidden shadow-card">
          <div className="relative">
            <ProfileBanner />
            <div className="absolute -bottom-12 left-6 z-10">
              <ProfileAvatar fallback={fallbackInitial} className="size-24 ring-4 ring-background shadow-glow" />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary" className="absolute top-3 right-3 z-10"><Settings className="size-4 mr-1"/>Editar</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Editar perfil <span className="text-primary">PlayBeach</span></DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Foto do perfil</Label>
                    <ProfileAvatar fallback={fallbackInitial} className="size-20" editable />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nome</Label>
                    <Input value={displayName} disabled readOnly />
                    <p className="text-[11px] text-muted-foreground">Nome vindo da sua conta Google.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Apelido / @username</Label><Input value={form.apelido} onChange={e => setForm({ ...form, apelido: e.target.value })} maxLength={30}/></div>
                    <div className="space-y-1.5"><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} maxLength={20}/></div>
                    <div className="space-y-1.5"><Label>Cidade</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}/></div>
                    <div className="space-y-1.5"><Label>Estado</Label><Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} maxLength={2} placeholder="SP"/></div>
                    <div className="space-y-1.5"><Label>Altura (m)</Label><Input type="number" step="0.01" value={form.altura} onChange={e => setForm({ ...form, altura: e.target.value })} placeholder="1.80"/></div>
                    <div className="space-y-1.5"><Label>Instagram</Label><Input value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="@seuinsta"/></div>
                    <div className="space-y-1.5">
                      <Label>Posição</Label>
                      <Select value={form.posicao_principal} onValueChange={(v) => setForm({ ...form, posicao_principal: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Atacante">Atacante</SelectItem>
                          <SelectItem value="Defensor">Defensor</SelectItem>
                          <SelectItem value="Levantador">Levantador</SelectItem>
                          <SelectItem value="Universal">Universal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nível</Label>
                      <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Iniciante">Iniciante</SelectItem>
                          <SelectItem value="Intermediário">Intermediário</SelectItem>
                          <SelectItem value="Avançado">Avançado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Mão dominante</Label>
                      <Select value={form.mao_dominante} onValueChange={(v) => setForm({ ...form, mao_dominante: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Direita">Direita</SelectItem>
                          <SelectItem value="Esquerda">Esquerda</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5"><Label>Bio</Label><Textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} maxLength={200}/></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={onSave} disabled={saving}>{saving && <Loader2 className="size-4 mr-2 animate-spin"/>}Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="pt-16 px-6 pb-6">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <h1 className="font-display text-3xl leading-none">{displayName}</h1>
                <div className="text-sm text-muted-foreground">@{username.replace(/^@/, "")}</div>
              </div>
              {profile.level && <Badge className="gradient-beach text-white border-0 ml-auto">{profile.level}</Badge>}
            </div>
            {bio && <p className="text-sm mt-3">{bio}</p>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-xs">
              <Info icon={MapPin} label="Cidade" value={cityState}/>
              <Info icon={Ruler} label="Altura" value={profile.altura ? `${profile.altura} m` : "—"}/>
              <Info icon={Hand} label="Mão" value={profile.mao_dominante || "—"}/>
              <Info icon={Target} label="Posição" value={profile.posicao_principal || "—"}/>
              {profile.whatsapp && <Info icon={MessageCircle} label="WhatsApp" value={profile.whatsapp}/>}
              {profile.instagram && <Info icon={Instagram} label="Instagram" value={profile.instagram}/>}
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Pontos" value={profile.pontos ?? 0} accent/>
          <Stat label="Vitórias" value={profile.vitorias ?? 0} sub={`${winRate}% apr.`}/>
          <Stat label="Derrotas" value={profile.derrotas ?? 0}/>
          <Stat label="Jogos" value={matches}/>
        </div>

        {/* Montar time */}
        <TeamBuilder currentId={profile.id} />

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

        <Button variant="outline" className="w-full" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}>Sair</Button>
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
  const [format, setFormat] = useState<TeamFormat>("Dupla");
  const [selected, setSelected] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string>(currentId);

  const formatInvitesCount: Record<TeamFormat, number> = {
    Dupla: 1,
    "Dupla mista": 1,
    Quarteto: 3,
    "Quarteto misto": 3,
  };

  // Formatos em que já estou no ranking (não posso abrir outro time no mesmo formato)
  const myRankedFormats = new Set<TeamFormat>(
    teams
      .filter(t => t.invites.length > 0 && t.invites.every(i => i.status === "accepted"))
      .map(t => t.format)
  );

  // Jogadores que já estão num time meu (no ranking) do formato selecionado — não aparecem
  const playersInRankedFormat = new Set<string>(
    teams
      .filter(t => t.format === format && t.invites.length > 0 && t.invites.every(i => i.status === "accepted"))
      .flatMap(t => [t.captainId, ...t.invites.map(i => i.playerId)])
  );

  const availableFormats = TEAM_FORMATS.filter(f => !myRankedFormats.has(f));
  const visibleOthers = others.filter(pl => !playersInRankedFormat.has(pl.id));

  // Se o formato atual ficou bloqueado, troca para o primeiro disponível
  useEffect(() => {
    if (myRankedFormats.has(format) && availableFormats.length > 0) {
      setFormat(availableFormats[0]);
      setSelected([]);
    }
  }, [teams]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => { setName(""); setFormat(availableFormats[0] ?? "Dupla"); setSelected([]); setCaptainId(currentId); };

  const toggle = (id: string) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const create = () => {
    if (!name.trim()) return toast.error("Dê um nome ao time");
    if (myRankedFormats.has(format)) return toast.error(`Você já participa de um time no formato ${format}`);
    const required = formatInvitesCount[format];
    if (selected.length !== required) return toast.error(`Para ${format.toLowerCase()}, selecione exatamente ${required} participante(s)`);

    const eligible = [currentId, ...selected];
    if (!eligible.includes(captainId)) return toast.error("Escolha um capitão dentre os membros");
    const team: Team = {
      id: `t${Date.now()}`,
      name: name.trim(),
      format,
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
            <Button size="sm" className="gradient-beach text-white border-0" disabled={availableFormats.length === 0}>
              <Plus className="size-4 mr-1"/>Montar time
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Montar novo time</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="team-name">Nome do time</Label>
                <Input id="team-name" placeholder="Ex: Tubarões da Areia" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Formato</Label>
                <Select value={format} onValueChange={(v) => { setFormat(v as TeamFormat); setSelected([]); }}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {availableFormats.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                {myRankedFormats.size > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Você já está no ranking em: {[...myRankedFormats].join(", ")}.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Participantes</Label>
                <div className="space-y-1 max-h-64 overflow-y-auto rounded-md border p-2">
                  {visibleOthers.length === 0 ? (
                    <div className="text-xs text-muted-foreground p-2 text-center">
                      Nenhum jogador disponível para este formato.
                    </div>
                  ) : visibleOthers.map(pl => (
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-display text-base">{t.name}</div>
                      <Badge variant="outline" className="text-[10px]">{t.format}</Badge>
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

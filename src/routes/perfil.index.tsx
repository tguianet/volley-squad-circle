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

import { MapPin, Ruler, Hand, Instagram, MessageCircle, Settings, Target, Users, Crown, Send, Check, X, Plus, Trash2, Loader2, LogOut } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  genero: string | null;
  status: string | null;
  pontos: number | null;
  vitorias: number | null;
  derrotas: number | null;
};

async function fetchMyProfile(): Promise<MyProfile | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, apelido, bio, city, state, whatsapp, instagram, posicao_principal, level, mao_dominante, altura, avatar_url, banner_url, genero, status, pontos, vitorias, derrotas")
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
      altura: null, avatar_url: null, banner_url: null, genero: null, status: null, pontos: 0, vitorias: 0, derrotas: 0,
    }),
  } as MyProfile;
}

function normalizeAltura(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const raw = Number(trimmed);
  if (!Number.isFinite(raw) || raw <= 0) throw new Error("Informe uma altura válida.");
  const meters = raw > 10 ? raw / 100 : raw;
  if (meters < 1 || meters > 2.5) throw new Error("Informe a altura em metros ou centímetros. Ex: 1,67 ou 167.");
  return Number(meters.toFixed(2));
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
    posicao_principal: "", level: "", mao_dominante: "", altura: "", genero: "",
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
      genero: profile.genero ?? "",
    });
  }, [open, profile?.id]);

  const onSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const isProfileComplete =
        form.apelido.trim() &&
        form.city.trim() &&
        form.state.trim() &&
        form.whatsapp.trim() &&
        form.posicao_principal &&
        form.level &&
        form.mao_dominante &&
        form.genero;

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
        altura: normalizeAltura(form.altura),
        genero: form.genero || null,
        status: isProfileComplete ? "completo" : undefined,
      };
      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", profile.id)
        .select("id")
        .maybeSingle();
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
                    <div className="space-y-1.5"><Label>Altura</Label><Input type="number" step="0.01" value={form.altura} onChange={e => setForm({ ...form, altura: e.target.value })} placeholder="1.80 ou 180"/></div>
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
                    <div className="space-y-1.5">
                      <Label>Gênero</Label>
                      <Select value={form.genero} onValueChange={(v) => setForm({ ...form, genero: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Masculino</SelectItem>
                          <SelectItem value="F">Feminino</SelectItem>
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
        <MatchHistory userId={profile.id} />


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

type RosterPlayer = { id: string; display_name: string; apelido: string | null; username: string | null; avatar_url: string | null };

type DbInvitation = {
  id: string;
  invitee_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  invitee?: RosterPlayer | null;
};
type DbTeam = {
  id: string;
  name: string;
  category: "dupla" | "quarteto";
  gender: "M" | "F" | "X";
  captain_id: string;
  created_at: string;
  invitations: DbInvitation[];
};
type ReceivedInvite = {
  id: string;
  status: string;
  team: { id: string; name: string; category: string; gender: string; captain_id: string } | null;
  inviter: RosterPlayer | null;
};

function formatFromCategory(category: string, gender: string): TeamFormat {
  if (category === "quarteto") return gender === "X" ? "Quarteto misto" : "Quarteto";
  return gender === "X" ? "Dupla mista" : "Dupla";
}
function categoryGenderFromFormat(format: TeamFormat): { category: "dupla" | "quarteto"; gender: "M" | "X" } {
  const category = format.startsWith("Quarteto") ? "quarteto" : "dupla";
  const gender = format.includes("misto") || format.includes("mista") ? "X" : "M";
  return { category, gender };
}

function TeamBuilder({ currentId }: { currentId: string }) {
  const qc = useQueryClient();

  const rosterQ = useQuery<RosterPlayer[]>({
    queryKey: ["roster-players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, apelido, username, avatar_url")
        .neq("id", currentId)
        .order("display_name");
      if (error) throw error;
      return (data ?? []) as RosterPlayer[];
    },
  });
  const others: RosterPlayer[] = rosterQ.data ?? [];
  const getPlayer = (id: string): RosterPlayer | undefined => others.find(p => p.id === id);

  // Times onde eu sou capitão (com convites)
  const captainQ = useQuery<DbTeam[]>({
    queryKey: ["my-captain-teams", currentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, category, gender, captain_id, created_at, invitations:team_invitations(id, invitee_id, status, invitee:invitee_id(id, display_name, apelido, username, avatar_url))")
        .eq("captain_id", currentId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DbTeam[];
    },
  });

  // Times onde eu sou membro (aceitei convite)
  const memberQ = useQuery<DbTeam[]>({
    queryKey: ["my-member-teams", currentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("team:team_id!inner(id, name, category, gender, captain_id, created_at, is_active)")
        .eq("profile_id", currentId)
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return ((data ?? [])
        .map((r: any) => r.team)
        .filter((t: any) => t && t.is_active) as DbTeam[])
        .map(t => ({ ...t, invitations: [] }));
    },
    enabled: !!currentId,
  });

  const captainTeams: DbTeam[] = captainQ.data ?? [];
  const memberTeams: DbTeam[] = memberQ.data ?? [];
  // Merge and dedupe by id (capitão tem prioridade para dados completos)
  const teamsMap = new Map<string, DbTeam>();
  for (const t of memberTeams) teamsMap.set(t.id, t);
  for (const t of captainTeams) teamsMap.set(t.id, t);
  const teams = Array.from(teamsMap.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Membros (com perfil) de todos os meus times — para exibir miniaturas
  const teamIds = teams.map(t => t.id);
  const membersQ = useQuery<Record<string, RosterPlayer[]>>({
    queryKey: ["my-teams-members", teamIds.join(",")],
    enabled: teamIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("team_id, profile:profile_id(id, display_name, apelido, username, avatar_url)")
        .in("team_id", teamIds);
      if (error) throw error;
      const map: Record<string, RosterPlayer[]> = {};
      for (const r of (data ?? []) as any[]) {
        if (!r.profile) continue;
        (map[r.team_id] ??= []).push(r.profile as RosterPlayer);
      }
      return map;
    },
  });
  const membersByTeam = membersQ.data ?? {};
  // Capitães dos times (para incluir nas miniaturas)
  const captainIds = Array.from(new Set(teams.map(t => t.captain_id)));
  const captainsQ = useQuery<Record<string, RosterPlayer>>({
    queryKey: ["my-teams-captains", captainIds.join(",")],
    enabled: captainIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, apelido, username, avatar_url")
        .in("id", captainIds);
      if (error) throw error;
      const map: Record<string, RosterPlayer> = {};
      for (const p of (data ?? []) as RosterPlayer[]) map[p.id] = p;
      return map;
    },
  });
  const captainsById = captainsQ.data ?? {};

  // Convites recebidos
  const receivedQ = useQuery<ReceivedInvite[]>({
    queryKey: ["my-received-invites", currentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invitations")
        .select("id, status, team:team_id(id, name, category, gender, captain_id), inviter:inviter_id(id, display_name, apelido, username, avatar_url)")
        .eq("invitee_id", currentId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReceivedInvite[];
    },
  });
  const received: ReceivedInvite[] = receivedQ.data ?? [];

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [format, setFormat] = useState<TeamFormat>("Dupla");
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const formatInvitesCount: Record<TeamFormat, number> = {
    Dupla: 1,
    "Dupla mista": 1,
    Quarteto: 3,
    "Quarteto misto": 3,
  };

  // Formatos em que já tenho um time ativo
  const myExistingFormats = new Set<TeamFormat>(
    teams.map(t => formatFromCategory(t.category, t.gender))
  );
  const availableFormats = TEAM_FORMATS.filter(f => !myExistingFormats.has(f));

  useEffect(() => {
    if (myExistingFormats.has(format) && availableFormats.length > 0) {
      setFormat(availableFormats[0]);
      setSelected([]);
    }
  }, [captainQ.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => { setName(""); setFormat(availableFormats[0] ?? "Dupla"); setSelected([]); };

  const toggle = (id: string) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const create = async () => {
    if (!name.trim()) return toast.error("Dê um nome ao time");
    if (myExistingFormats.has(format)) return toast.error(`Você já tem um time no formato ${format}`);
    const required = formatInvitesCount[format];
    if (selected.length !== required) return toast.error(`Para ${format.toLowerCase()}, selecione exatamente ${required} participante(s)`);

    setSubmitting(true);
    try {
      const { category, gender } = categoryGenderFromFormat(format);
      const { data: team, error: tErr } = await supabase
        .from("teams")
        .insert({ name: name.trim(), category, gender, captain_id: currentId })
        .select("id")
        .single();
      if (tErr) throw tErr;

      // Capitão entra como membro imediatamente
      await supabase.from("team_members").insert({ team_id: team.id, profile_id: currentId });

      const rows = selected.map(pid => ({
        team_id: team.id,
        inviter_id: currentId,
        invitee_id: pid,
      }));
      const { error: iErr } = await supabase.from("team_invitations").insert(rows);
      if (iErr) throw iErr;

      toast.success(`Convites enviados para ${selected.length} jogador(es)`);
      setOpen(false);
      reset();
      qc.invalidateQueries({ queryKey: ["my-captain-teams"] });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Falha ao enviar convites");
    } finally {
      setSubmitting(false);
    }
  };

  const respondToReceived = async (inviteId: string, status: "accepted" | "declined") => {
    const { error } = await supabase
      .from("team_invitations")
      .update({ status })
      .eq("id", inviteId);
    if (error) return toast.error(error.message);
    toast.success(status === "accepted" ? "Convite aceito!" : "Convite recusado");
    qc.invalidateQueries({ queryKey: ["my-received-invites"] });
  };

  const refetchTeams = () => {
    qc.invalidateQueries({ queryKey: ["my-captain-teams"] });
    qc.invalidateQueries({ queryKey: ["my-member-teams"] });
    qc.invalidateQueries({ queryKey: ["my-teams-members"] });
    qc.invalidateQueries({ queryKey: ["my-teams-captains"] });
  };

  const deleteTeam = async (teamId: string, captainId: string) => {
    if (captainId !== currentId) return toast.error("Apenas o capitão pode deletar o time");
    const { error: mErr } = await supabase.from("team_members").delete().eq("team_id", teamId);
    if (mErr) return toast.error(mErr.message);
    await supabase.from("team_invitations").delete().eq("team_id", teamId);
    const { error } = await supabase.from("teams").delete().eq("id", teamId);
    if (error) return toast.error(error.message);
    toast.success("Time deletado com sucesso");
    refetchTeams();
  };

  const leaveTeam = async (teamId: string, captainId: string) => {
    const isCap = captainId === currentId;
    if (isCap) {
      // Buscar outros membros ordenados por joined_at
      const { data: others, error: oErr } = await supabase
        .from("team_members")
        .select("profile_id, joined_at")
        .eq("team_id", teamId)
        .neq("profile_id", currentId)
        .order("joined_at", { ascending: true });
      if (oErr) return toast.error(oErr.message);

      if (!others || others.length === 0) {
        // Único membro: deletar time
        await supabase.from("team_invitations").delete().eq("team_id", teamId);
        await supabase.from("team_members").delete().eq("team_id", teamId);
        const { error } = await supabase.from("teams").delete().eq("id", teamId);
        if (error) return toast.error(error.message);
        toast.success("Time removido porque não havia outros membros.");
        refetchTeams();
        return;
      }

      // Transferir capitania para o membro mais antigo
      const newCaptainId = others[0].profile_id;
      const { error: uErr } = await supabase
        .from("teams")
        .update({ captain_id: newCaptainId })
        .eq("id", teamId);
      if (uErr) return toast.error(uErr.message);

      const { error: dErr } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("profile_id", currentId);
      if (dErr) return toast.error(dErr.message);

      toast.success("Você saiu do time. Um novo capitão foi definido.");
      refetchTeams();
    } else {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("profile_id", currentId);
      if (error) return toast.error(error.message);
      toast.success("Você saiu do time");
      refetchTeams();
    }
  };

  const cancelInvite = async (inviteId: string) => {
    const { error } = await supabase.from("team_invitations").delete().eq("id", inviteId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-captain-teams"] });
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
                {myExistingFormats.size > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Você já tem time em: {[...myExistingFormats].join(", ")}.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Participantes ({selected.length}/{formatInvitesCount[format]})</Label>
                <div className="space-y-1 max-h-64 overflow-y-auto rounded-md border p-2">
                  {others.length === 0 ? (
                    <div className="text-xs text-muted-foreground p-2 text-center">
                      Nenhum jogador cadastrado ainda.
                    </div>
                  ) : others.map(pl => (
                    <label key={pl.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/60 cursor-pointer">
                      <Checkbox checked={selected.includes(pl.id)} onCheckedChange={() => toggle(pl.id)} />
                      <Avatar className="size-8"><AvatarImage src={pl.avatar_url ?? undefined}/><AvatarFallback>{pl.display_name[0]}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{pl.display_name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">@{pl.apelido ?? pl.username ?? ""}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancelar</Button>
              <Button onClick={create} disabled={submitting}>
                {submitting ? <Loader2 className="size-4 mr-1 animate-spin"/> : <Send className="size-4 mr-1"/>}
                Enviar convites
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {received.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Convites recebidos</div>
          {received.map(r => (
            <div key={r.id} className="flex items-center gap-2 p-2.5 rounded-md border bg-primary/5">
              <Avatar className="size-8"><AvatarImage src={r.inviter?.avatar_url ?? undefined}/><AvatarFallback>{r.inviter?.display_name?.[0] ?? "?"}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0 text-sm">
                <div className="font-medium truncate">{r.team?.name ?? "Time"}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  Convite de {r.inviter?.display_name ?? "—"} · {r.team ? formatFromCategory(r.team.category, r.team.gender) : ""}
                </div>
              </div>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => respondToReceived(r.id, "accepted")}><Check className="size-3.5 text-success"/></Button>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => respondToReceived(r.id, "declined")}><X className="size-3.5 text-destructive"/></Button>
            </div>
          ))}
        </div>
      )}

      {captainQ.isLoading || memberQ.isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground"/></div>
      ) : teams.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Você ainda não montou nenhum time. Clique em <strong>Montar time</strong> para começar.
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map(t => {
            const fmt = formatFromCategory(t.category, t.gender);
            const isCaptain = t.captain_id === currentId;
            const accepted = t.invitations.filter(i => i.status === "accepted").length;
            const total = t.invitations.length;
            const allIn = total > 0 && accepted === total;
            return (
              <div key={t.id} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-display text-base">{t.name}</div>
                      <Badge variant="outline" className="text-[10px]">{fmt}</Badge>
                      {isCaptain && allIn && <Badge className="gradient-beach text-white border-0 text-[10px]">No ranking</Badge>}
                    </div>
                    {isCaptain && <div className="text-[11px] text-muted-foreground">{accepted}/{total} confirmados</div>}
                  </div>
                  {isCaptain && (
                    <Button size="icon" variant="ghost" onClick={() => removeTeam(t.id)}><Trash2 className="size-4"/></Button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {(() => {
                    const cap = captainsById[t.captain_id];
                    const mem = membersByTeam[t.id] ?? [];
                    const seen = new Set<string>();
                    const roster: RosterPlayer[] = [];
                    if (cap) { roster.push(cap); seen.add(cap.id); }
                    for (const p of mem) if (!seen.has(p.id)) { roster.push(p); seen.add(p.id); }
                    if (roster.length === 0) return null;
                    return (
                      <div className="flex items-center gap-1.5 flex-wrap pb-1">
                        {roster.map(p => (
                          <div key={p.id} className="flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full bg-secondary/60">
                            <Avatar className="size-6"><AvatarImage src={p.avatar_url ?? undefined}/><AvatarFallback>{p.display_name[0]}</AvatarFallback></Avatar>
                            <span className="text-xs">{p.apelido ?? p.display_name}</span>
                            {p.id === t.captain_id && <Crown className="size-3 text-primary" />}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <div className={`flex items-center gap-2 p-2 rounded-md ${isCaptain ? "bg-primary/10" : "bg-secondary/40"}`}>
                    {isCaptain ? <Crown className="size-4 text-primary" /> : <Users className="size-4 text-muted-foreground" />}
                    <div className="flex-1 text-sm">{isCaptain ? "Você é o capitão" : "Você é membro"}</div>
                  </div>
                  {isCaptain && t.invitations.map(inv => {
                    const pl = inv.invitee ?? getPlayer(inv.invitee_id);
                    if (!pl) return null;
                    return (
                      <div key={inv.id} className="flex items-center gap-2 p-2 rounded-md bg-secondary/40">
                        <Avatar className="size-7"><AvatarImage src={pl.avatar_url ?? undefined}/><AvatarFallback>{pl.display_name[0]}</AvatarFallback></Avatar>
                        <div className="flex-1 text-sm">{pl.display_name}</div>
                        {inv.status === "pending" && (
                          <>
                            <Badge variant="secondary" className="text-[10px]">Pendente</Badge>
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => cancelInvite(inv.id)}><X className="size-3.5 text-destructive"/></Button>
                          </>
                        )}
                        {inv.status === "accepted" && <Badge className="bg-success/20 text-success border-0 text-[10px]">Aceitou</Badge>}
                        {inv.status === "declined" && <Badge variant="destructive" className="text-[10px]">Recusou</Badge>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function MatchHistory({ userId }: { userId: string }) {
  const { data = [] } = useQuery({
    queryKey: ["profile-matches", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_players")
        .select("match:match_id(id, title, date, start_time, modality, match_type, status, arena:arena_id(name))")
        .eq("player_id", userId)
        .order("joined_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.match).filter(Boolean);
    },
  });

  return (
    <Card className="p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg">Histórico recente</h2>
        <Link to="/h2h" className="text-xs text-primary font-semibold">Comparar H2H →</Link>
      </div>
      {data.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-6">
          Nenhuma partida registrada ainda.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((m: any) => (
            <li key={m.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/60 text-sm">
              <div className="min-w-0">
                <div className="font-semibold truncate">{m.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {m.arena?.name ?? "—"} · {m.date} · {m.start_time?.slice(0,5)}
                </div>
              </div>
              <Badge variant="outline" className="ml-2 capitalize">{m.match_type}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}


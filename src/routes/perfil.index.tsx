import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Crown,
  Send,
  Check,
  X,
  Plus,
  Trash2,
  Loader2,
  LogOut,
  Users,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AvatarThumb } from "@/components/avatar-thumb";
import { getTeamFormats, formatFromCategory, categoryGenderFromFormat } from "@/lib/team-format";
import { MyProfileHeader } from "@/components/profile/my-profile-header";
import { MyProfileTabs } from "@/components/profile/my-profile-tabs";
import type { PublicProfileAboutData } from "@/components/profile/public-profile-about";
import { getErrorMessage } from "@/lib/utils";

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
  arena_id: string | null;
  arena_name: string | null;
};

async function fetchMyProfile(): Promise<MyProfile | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, username, apelido, bio, city, state, whatsapp, instagram, posicao_principal, level, mao_dominante, altura, avatar_url, banner_url, genero, status, pontos, vitorias, derrotas",
    )
    .eq("id", u.user.id)
    .maybeSingle();
  if (error) throw error;
  const meta = (u.user.user_metadata ?? {}) as Record<string, unknown>;
  const profileRow = data as Partial<MyProfile> | null;
  return {
    email: u.user.email ?? null,
    google_name: (meta.full_name ?? meta.name ?? null) as string | null,
    google_picture: (meta.avatar_url ?? meta.picture ?? null) as string | null,
    ...(profileRow ?? {
      display_name: null,
      username: null,
      apelido: null,
      bio: null,
      city: null,
      state: null,
      whatsapp: null,
      instagram: null,
      posicao_principal: null,
      level: null,
      mao_dominante: null,
      altura: null,
      avatar_url: null,
      banner_url: null,
      genero: null,
      status: null,
      pontos: 0,
      vitorias: 0,
      derrotas: 0,
    }),
    arena_id: null,
    arena_name: null,
    id: u.user.id,
  } as MyProfile;
}

function ProfilePage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: fetchMyProfile,
  });

  if (isLoading || !profile) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-12 flex justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const emailHandle = profile.email?.split("@")[0] ?? "";
  const displayName = profile.display_name || profile.google_name || emailHandle || "Jogador";
  const username = profile.apelido || profile.username || emailHandle || "jogador";
  const fallbackInitial = (displayName[0] ?? "?").toUpperCase();

  const aboutData: PublicProfileAboutData = {
    bio: profile.bio,
    city: profile.city,
    state: profile.state,
    altura: profile.altura,
    mao_dominante: profile.mao_dominante,
    posicao_principal: profile.posicao_principal,
    level: profile.level,
    instagram: profile.instagram,
    whatsapp: profile.whatsapp,
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        <MyProfileHeader
          profile={profile}
          displayName={displayName}
          username={username}
          fallbackInitial={fallbackInitial}
          pontos={profile.pontos ?? 0}
          vitorias={profile.vitorias ?? 0}
          derrotas={profile.derrotas ?? 0}
        />

        <MyProfileTabs
          profile={{
            id: profile.id,
            display_name: profile.display_name,
            apelido: profile.apelido,
            avatar_url: profile.avatar_url,
            pontos: profile.pontos,
            vitorias: profile.vitorias,
            derrotas: profile.derrotas,
          }}
          aboutData={aboutData}
          teamsSection={<TeamBuilder currentId={profile.id} currentGender={profile.genero} />}
          matchesSection={<MatchHistory userId={profile.id} />}
        />

        <Button
          variant="ghost"
          className="w-full text-muted-foreground hover:text-destructive"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/auth";
          }}
        >
          <LogOut className="size-4 mr-2" />
          Sair da conta
        </Button>
      </div>
    </AppLayout>
  );
}

type RosterPlayer = {
  id: string;
  display_name: string;
  apelido: string | null;
  username: string | null;
  avatar_url: string | null;
  genero: string | null;
};

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

function TeamBuilder({
  currentId,
  currentGender,
}: {
  currentId: string;
  currentGender?: string | null;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const rosterQ = useQuery<RosterPlayer[]>({
    queryKey: ["roster-players"],
    enabled: open,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, apelido, username, avatar_url, genero")
        .neq("id", currentId)
        .order("display_name");
      if (error) throw error;
      return (data ?? []) as RosterPlayer[];
    },
  });

  const others: RosterPlayer[] = rosterQ.data ?? [];
  const getPlayer = (id: string): RosterPlayer | undefined => others.find((p) => p.id === id);

  const captainQ = useQuery<DbTeam[]>({
    queryKey: ["my-captain-teams", currentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select(
          "id, name, category, gender, captain_id, created_at, invitations:team_invitations(id, invitee_id, status, invitee:invitee_id(id, display_name, apelido, username, avatar_url))",
        )
        .eq("captain_id", currentId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DbTeam[];
    },
  });

  const memberQ = useQuery<DbTeam[]>({
    queryKey: ["my-member-teams", currentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("team:team_id!inner(id, name, category, gender, captain_id, created_at, is_active)")
        .eq("profile_id", currentId)
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((r) => r.team)
        .filter((t) => t?.is_active)
        .map((t) => ({ ...t!, invitations: [] as DbInvitation[] }));
    },
    enabled: !!currentId,
  });

  const captainTeams: DbTeam[] = captainQ.data ?? [];
  const memberTeams: DbTeam[] = memberQ.data ?? [];
  const teamsMap = new Map<string, DbTeam>();
  for (const t of memberTeams) teamsMap.set(t.id, t);
  for (const t of captainTeams) teamsMap.set(t.id, t);
  const teams = Array.from(teamsMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const teamIds = teams.map((t) => t.id);
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
      for (const r of (data ?? []) as { team_id: string; profile: RosterPlayer | null }[]) {
        if (!r.profile) continue;
        (map[r.team_id] ??= []).push(r.profile as RosterPlayer);
      }
      return map;
    },
  });
  const membersByTeam = membersQ.data ?? {};

  const captainIds = Array.from(new Set(teams.map((t) => t.captain_id)));
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

  const receivedQ = useQuery<ReceivedInvite[]>({
    queryKey: ["my-received-invites", currentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invitations")
        .select(
          "id, status, team:team_id(id, name, category, gender, captain_id), inviter:inviter_id(id, display_name, apelido, username, avatar_url)",
        )
        .eq("invitee_id", currentId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReceivedInvite[];
    },
  });
  const received: ReceivedInvite[] = receivedQ.data ?? [];

  const [name, setName] = useState("");

  const defaultFormat = getTeamFormats(currentGender)[0];
  const [format, setFormat] = useState(defaultFormat);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const required = categoryGenderFromFormat(format).category === "quarteto" ? 3 : 1;
  const myExistingFormats = new Set<string>(
    teams.map((t) => formatFromCategory(t.category, t.gender)),
  );
  const availableFormats = getTeamFormats(currentGender).filter((f) => !myExistingFormats.has(f));

  useEffect(() => {
    if (myExistingFormats.has(format) && availableFormats.length > 0) {
      setFormat(availableFormats[0]);
      setSelected([]);
    }
  }, [captainQ.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setName("");
    setFormat(availableFormats[0] ?? defaultFormat);
    setSelected([]);
  };

  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const create = async () => {
    if (!name.trim()) return toast.error("Dê um nome ao time");
    if (myExistingFormats.has(format))
      return toast.error(`Você já tem um time no formato ${format}`);
    if (selected.length !== required)
      return toast.error(
        `Para ${format.toLowerCase()}, selecione exatamente ${required} participante(s)`,
      );

    setSubmitting(true);
    try {
      const { category, gender } = categoryGenderFromFormat(format);
      const { data: team, error: tErr } = await supabase
        .from("teams")
        .insert({ name: name.trim(), category, gender, captain_id: currentId })
        .select("id")
        .single();
      if (tErr) throw tErr;

      await supabase.from("team_members").insert({ team_id: team.id, profile_id: currentId });

      const rows = selected.map((pid) => ({
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
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Falha ao enviar convites"));
    } finally {
      setSubmitting(false);
    }
  };

  const respondToReceived = async (inviteId: string, status: "accepted" | "declined") => {
    const { error } = await supabase.from("team_invitations").update({ status }).eq("id", inviteId);
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
      const { data: others, error: oErr } = await supabase
        .from("team_members")
        .select("profile_id, joined_at")
        .eq("team_id", teamId)
        .neq("profile_id", currentId)
        .order("joined_at", { ascending: true });
      if (oErr) return toast.error(oErr.message);

      if (!others || others.length === 0) {
        await supabase.from("team_invitations").delete().eq("team_id", teamId);
        await supabase.from("team_members").delete().eq("team_id", teamId);
        const { error } = await supabase.from("teams").delete().eq("id", teamId);
        if (error) return toast.error(error.message);
        toast.success("Time removido porque não havia outros membros.");
        refetchTeams();
        return;
      }

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
    <Card className="p-4 sm:p-5 shadow-card border-border/80">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-primary" />
          <h2 className="font-semibold text-base">Meus times</h2>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) reset();
          }}
        >
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="gradient-beach text-white border-0 shrink-0"
              disabled={availableFormats.length === 0}
            >
              <Plus className="size-4 mr-1" />
              Montar time
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Montar novo time</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="team-name">Nome do time</Label>
                <Input
                  id="team-name"
                  placeholder="Ex: Tubarões da Areia"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Formato</Label>
                <Select
                  value={format}
                  onValueChange={(v) => {
                    setFormat(v);
                    setSelected([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFormats.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  Participantes ({selected.length}/{required})
                </Label>
                <div className="space-y-1 max-h-64 overflow-y-auto rounded-md border p-2">
                  {others
                    .filter((p) => {
                      if (!currentGender) return false;
                      if (format.includes("misto") || format.includes("mista")) return true;
                      return p.genero === currentGender;
                    })
                    .map((pl) => (
                      <label
                        key={pl.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/60 cursor-pointer"
                      >
                        <Checkbox
                          checked={selected.includes(pl.id)}
                          onCheckedChange={() => toggle(pl.id)}
                        />
                        <Avatar className="size-8">
                          <AvatarImage src={pl.avatar_url ?? undefined} />
                          <AvatarFallback>{pl.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{pl.display_name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            @{pl.apelido ?? pl.username ?? ""}
                          </div>
                        </div>
                      </label>
                    ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button onClick={create} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="size-4 mr-1 animate-spin" />
                ) : (
                  <Send className="size-4 mr-1" />
                )}
                Enviar convites
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {received.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Convites recebidos
          </div>
          {received.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 p-2.5 rounded-xl border bg-primary/5"
            >
              <AvatarThumb src={r.inviter?.avatar_url} name={r.inviter?.display_name} />
              <div className="flex-1 min-w-0 text-sm">
                <div className="font-medium truncate">{r.team?.name ?? "Time"}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  Convite de {r.inviter?.display_name ?? "—"} ·{" "}
                  {r.team ? formatFromCategory(r.team.category, r.team.gender) : ""}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => respondToReceived(r.id, "accepted")}
              >
                <Check className="size-3.5 text-green-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => respondToReceived(r.id, "declined")}
              >
                <X className="size-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {captainQ.isLoading || memberQ.isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Você ainda não montou nenhum time.
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map((t) => {
            const fmt = formatFromCategory(t.category, t.gender);
            const isCaptain = t.captain_id === currentId;
            const accepted = t.invitations.filter((i) => i.status === "accepted").length;
            const total = t.invitations.length;
            const allIn = total > 0 && accepted === total;
            return (
              <div key={t.id} className="rounded-xl border border-border/70 p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-sm truncate">{t.name}</div>
                      <Badge variant="outline" className="text-[10px]">
                        {fmt}
                      </Badge>
                      {isCaptain && allIn && (
                        <Badge className="gradient-beach text-white border-0 text-[10px]">
                          No ranking
                        </Badge>
                      )}
                    </div>
                    {isCaptain && (
                      <div className="text-[11px] text-muted-foreground">
                        {accepted}/{total} confirmados
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" title="Sair do time">
                          <LogOut className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sair do time</AlertDialogTitle>
                          <AlertDialogDescription>
                            {isCaptain
                              ? "Tem certeza? A capitania será transferida ou o time removido."
                              : "Tem certeza que deseja sair deste time?"}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => leaveTeam(t.id, t.captain_id)}>
                            Sair
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    {isCaptain && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" title="Deletar time">
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deletar time</AlertDialogTitle>
                            <AlertDialogDescription>
                              Essa ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteTeam(t.id, t.captain_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Deletar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
                {isCaptain &&
                  t.invitations.map((inv) => {
                    const pl = inv.invitee ?? getPlayer(inv.invitee_id);
                    if (!pl) return null;
                    return (
                      <div
                        key={inv.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-secondary/40 text-sm"
                      >
                        <AvatarThumb
                          src={pl.avatar_url}
                          name={pl.display_name}
                          className="size-7"
                        />
                        <div className="flex-1 truncate">{pl.display_name}</div>
                        {inv.status === "pending" && (
                          <>
                            <Badge variant="secondary" className="text-[10px]">
                              Pendente
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => cancelInvite(inv.id)}
                            >
                              <X className="size-3.5 text-destructive" />
                            </Button>
                          </>
                        )}
                        {inv.status === "accepted" && (
                          <Badge className="bg-green-600/15 text-green-700 border-0 text-[10px]">
                            Aceitou
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                {(() => {
                  const cap = captainsById[t.captain_id];
                  const mem = membersByTeam[t.id] ?? [];
                  const seen = new Set<string>();
                  const roster: RosterPlayer[] = [];
                  if (cap) {
                    roster.push(cap);
                    seen.add(cap.id);
                  }
                  for (const p of mem)
                    if (!seen.has(p.id)) {
                      roster.push(p);
                      seen.add(p.id);
                    }
                  if (roster.length === 0) return null;
                  return (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {roster.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full bg-secondary/60"
                        >
                          <AvatarThumb
                            src={p.avatar_url}
                            name={p.display_name}
                            className="size-6"
                          />
                          <span className="text-xs">{p.apelido ?? p.display_name}</span>
                          {p.id === t.captain_id && <Crown className="size-3 text-primary" />}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function MatchHistory({ userId }: { userId: string }) {
  type MatchSummary = {
    id: string;
    title: string;
    date: string;
    start_time: string | null;
    match_type: string;
    arena: { name: string } | null;
  };

  const { data = [] } = useQuery<MatchSummary[]>({
    queryKey: ["profile-matches", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_players")
        .select(
          "match:match_id(id, title, date, start_time, modality, match_type, status, arena:arena_id(name))",
        )
        .eq("player_id", userId)
        .order("joined_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? [])
        .map((r: { match: MatchSummary | null }) => r.match)
        .filter((m): m is MatchSummary => m != null);
    },
  });

  return (
    <Card className="p-5 shadow-card border-border/80">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-base">Partidas recentes</h2>
        <Link to="/h2h" className="text-xs text-primary font-semibold hover:underline">
          Comparar H2H →
        </Link>
      </div>
      {data.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">
          Nenhuma partida registrada ainda.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 text-sm"
            >
              <div className="min-w-0">
                <div className="font-semibold truncate">{m.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {m.arena?.name ?? "—"} · {m.date} · {m.start_time?.slice(0, 5)}
                </div>
              </div>
              <Badge variant="outline" className="ml-2 capitalize shrink-0">
                {m.match_type}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

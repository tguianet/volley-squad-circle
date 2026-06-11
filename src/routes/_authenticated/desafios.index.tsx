import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  listArenas, listTeams, getMyTeams, createTeam, listProfiles,
  getTeamAvailability, upsertSundayAvailability,
  findCommonSundays, createChallenge, respondToChallenge, listMyChallenges,
} from "@/lib/ranking.functions";
import {
  CalendarDays, Swords, Plus, Clock, MapPin, Check, X, RotateCcw, Crown,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/desafios/")({
  head: () => ({
    meta: [
      { title: "Desafios — BeachPlay Arena" },
      { name: "description", content: "Disponibilidade mensal aos domingos e desafios entre equipes." },
    ],
  }),
  component: DesafiosPage,
});

function formatSunday(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function DesafiosPage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  useMemo(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const fetchArenas = useServerFn(listArenas);
  const fetchTeams = useServerFn(listTeams);
  const fetchMyTeams = useServerFn(getMyTeams);
  const fetchMyChallenges = useServerFn(listMyChallenges);

  const arenasQ = useQuery({ queryKey: ["arenas"], queryFn: () => fetchArenas() });
  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: () => fetchTeams() });
  const myTeamsQ = useQuery({ queryKey: ["my-teams"], queryFn: () => fetchMyTeams() });
  const myChallengesQ = useQuery({
    queryKey: ["my-challenges"],
    queryFn: () => fetchMyChallenges(),
  });

  const captainedTeams = (myTeamsQ.data ?? []).filter((t) => t.captain_id === userId);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const activeTeamId = selectedTeamId ?? captainedTeams[0]?.id ?? null;

  if (!userId) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl">Desafios</h1>
            <p className="text-sm text-muted-foreground">
              Os jogos do ranking acontecem aos domingos. Defina a disponibilidade da sua equipe.
            </p>
          </div>
          <CreateTeamButton arenas={arenasQ.data ?? []} />
        </div>

        {captainedTeams.length > 1 && (
          <Card className="p-3">
            <Label className="text-xs mb-1 block">Equipe selecionada</Label>
            <Select value={activeTeamId ?? ""} onValueChange={setSelectedTeamId}>
              <SelectTrigger><SelectValue placeholder="Escolha a equipe"/></SelectTrigger>
              <SelectContent>
                {captainedTeams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>
        )}

        <Tabs defaultValue="availability">
          <TabsList className="bg-secondary">
            <TabsTrigger value="availability"><CalendarDays className="size-4 mr-1"/>Disponibilidade</TabsTrigger>
            <TabsTrigger value="challenge"><Swords className="size-4 mr-1"/>Desafiar</TabsTrigger>
            <TabsTrigger value="mine">Meus desafios</TabsTrigger>
          </TabsList>

          <TabsContent value="availability" className="mt-4">
            {activeTeamId ? (
              <AvailabilityPanel teamId={activeTeamId} arenas={arenasQ.data ?? []}/>
            ) : (
              <EmptyState
                title="Você ainda não é capitão de nenhuma equipe"
                hint="Crie uma equipe para começar a definir sua disponibilidade."
              />
            )}
          </TabsContent>

          <TabsContent value="challenge" className="mt-4">
            {activeTeamId ? (
              <ChallengePanel
                myTeamId={activeTeamId}
                allTeams={teamsQ.data ?? []}
                onCreated={() => {
                  qc.invalidateQueries({ queryKey: ["my-challenges"] });
                }}
              />
            ) : (
              <EmptyState
                title="Crie uma equipe para desafiar outras"
                hint="Apenas capitães podem enviar desafios."
              />
            )}
          </TabsContent>

          <TabsContent value="mine" className="mt-4">
            <MyChallengesPanel
              data={myChallengesQ.data}
              loading={myChallengesQ.isLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// =====================================================================
function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <Card className="p-8 text-center">
      <p className="font-semibold mb-1">{title}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </Card>
  );
}

// =====================================================================
function CreateTeamButton({ arenas }: { arenas: Array<{ id: string; name: string }> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"dupla" | "quarteto">("dupla");
  const [gender, setGender] = useState<"M" | "F" | "X">("M");
  const [arenaId, setArenaId] = useState<string>("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const createFn = useServerFn(createTeam);
  const fetchProfiles = useServerFn(listProfiles);

  const [myId, setMyId] = useState<string | null>(null);
  useMemo(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, []);

  const profilesQ = useQuery({
    queryKey: ["profiles-all"],
    queryFn: () => fetchProfiles(),
    enabled: open,
  });

  const required = category === "dupla" ? 1 : 3;
  const others = (profilesQ.data ?? []).filter((p) => p.id !== myId);
  const filtered = others.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.display_name ?? "").toLowerCase().includes(q) ||
      (p.username ?? "").toLowerCase().includes(q)
    );
  });

  const toggleMember = (id: string) => {
    setSelectedMembers((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= required) {
        toast.error(`Selecione no máximo ${required} jogador(es) para ${category}`);
        return s;
      }
      return [...s, id];
    });
  };

  const m = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      toast.success("Equipe criada");
      qc.invalidateQueries({ queryKey: ["my-teams"] });
      qc.invalidateQueries({ queryKey: ["teams"] });
      setOpen(false);
      setName("");
      setSelectedMembers([]);
      setSearch("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // reset selection when category changes (different required count)
  const onCategoryChange = (v: "dupla" | "quarteto") => {
    setCategory(v);
    setSelectedMembers([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4 mr-1"/>Nova equipe</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Criar equipe (você será o capitão)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sol do Mar"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => onCategoryChange(v as "dupla" | "quarteto")}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dupla">Dupla</SelectItem>
                  <SelectItem value="quarteto">Quarteto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gênero</Label>
              <Select value={gender} onValueChange={(v) => setGender(v as "M" | "F" | "X")}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                  <SelectItem value="X">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Arena preferida (opcional)</Label>
            <Select value={arenaId} onValueChange={setArenaId}>
              <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
              <SelectContent>
                {arenas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              {category === "dupla" ? "Parceiro(a)" : "Jogadores"}{" "}
              <span className="text-xs text-muted-foreground">
                ({selectedMembers.length}/{required})
              </span>
            </Label>

            <Select
              value=""
              onValueChange={(v) => { if (v) toggleMember(v); }}
              disabled={profilesQ.isLoading || selectedMembers.length >= required}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    profilesQ.isLoading
                      ? "Carregando perfis…"
                      : selectedMembers.length >= required
                        ? `Limite atingido (${required})`
                        : "Selecione um perfil existente"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {others
                  .filter((p) => !selectedMembers.includes(p.id))
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.display_name ?? "Sem nome"}
                      {p.username ? ` (@${p.username})` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedMembers.map((id) => {
                  const p = others.find((x) => x.id === id);
                  if (!p) return null;
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="flex items-center gap-2 pl-1 pr-2 py-1"
                    >
                      <Avatar className="size-5">
                        <AvatarImage src={p.avatar_url ?? undefined}/>
                        <AvatarFallback className="text-[10px]">
                          {(p.display_name ?? "?").slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{p.display_name ?? "Sem nome"}</span>
                      <button
                        type="button"
                        onClick={() => toggleMember(id)}
                        className="ml-1 rounded hover:bg-background/40"
                        aria-label="Remover"
                      >
                        <X className="size-3"/>
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!name || selectedMembers.length !== required || m.isPending}
            onClick={() =>
              m.mutate({
                data: {
                  name,
                  category,
                  gender,
                  preferred_arena_id: arenaId || null,
                  member_profile_ids: selectedMembers,
                },
              })
            }
          >
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================================
type Availability = {
  id: string;
  sunday_date: string;
  is_available: boolean;
  time_start: string | null;
  time_end: string | null;
  arena_id: string | null;
};

function AvailabilityPanel({
  teamId,
  arenas,
}: {
  teamId: string;
  arenas: Array<{ id: string; name: string }>;
}) {
  const qc = useQueryClient();
  const fetchAvail = useServerFn(getTeamAvailability);
  const upsertFn = useServerFn(upsertSundayAvailability);
  const q = useQuery<Availability[]>({
    queryKey: ["availability", teamId],
    queryFn: () => fetchAvail({ data: { teamId } }),
  });
  const m = useMutation({
    mutationFn: upsertFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability", teamId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando domingos…</p>;
  const rows = q.data ?? [];
  if (rows.length === 0) {
    return <EmptyState title="Sem domingos neste mês" hint="Tente novamente em instantes."/>;
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Card key={r.id} className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Domingo {formatSunday(r.sunday_date)}</div>
              <div className="text-xs text-muted-foreground">
                {r.is_available ? "Disponível" : "Indisponível"}
              </div>
            </div>
            <Switch
              checked={r.is_available}
              onCheckedChange={(checked) =>
                m.mutate({
                  data: {
                    teamId,
                    sundayDate: r.sunday_date,
                    isAvailable: checked,
                    timeStart: r.time_start,
                    timeEnd: r.time_end,
                    arenaId: r.arena_id,
                  },
                })
              }
            />
          </div>

          {r.is_available && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              <div>
                <Label className="text-xs">Início</Label>
                <Input
                  type="time"
                  defaultValue={r.time_start ?? "08:00"}
                  onBlur={(e) =>
                    m.mutate({
                      data: {
                        teamId,
                        sundayDate: r.sunday_date,
                        isAvailable: true,
                        timeStart: e.target.value,
                        timeEnd: r.time_end ?? "12:00",
                        arenaId: r.arena_id,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Fim</Label>
                <Input
                  type="time"
                  defaultValue={r.time_end ?? "12:00"}
                  onBlur={(e) =>
                    m.mutate({
                      data: {
                        teamId,
                        sundayDate: r.sunday_date,
                        isAvailable: true,
                        timeStart: r.time_start ?? "08:00",
                        timeEnd: e.target.value,
                        arenaId: r.arena_id,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Arena</Label>
                <Select
                  value={r.arena_id ?? ""}
                  onValueChange={(v) =>
                    m.mutate({
                      data: {
                        teamId,
                        sundayDate: r.sunday_date,
                        isAvailable: true,
                        timeStart: r.time_start,
                        timeEnd: r.time_end,
                        arenaId: v || null,
                      },
                    })
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Arena"/></SelectTrigger>
                  <SelectContent>
                    {arenas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// =====================================================================
function ChallengePanel({
  myTeamId,
  allTeams,
  onCreated,
}: {
  myTeamId: string;
  allTeams: Array<{ id: string; name: string; category: string; rank_position: number | null; captain_id: string }>;
  onCreated: () => void;
}) {
  const myTeam = allTeams.find((t) => t.id === myTeamId);
  const candidates = allTeams.filter(
    (t) => t.id !== myTeamId && t.category === myTeam?.category,
  );
  const [targetId, setTargetId] = useState<string>("");
  const findFn = useServerFn(findCommonSundays);
  const createFn = useServerFn(createChallenge);

  const overlapsQ = useQuery({
    enabled: !!targetId,
    queryKey: ["overlaps", myTeamId, targetId],
    queryFn: () =>
      findFn({ data: { challengerTeamId: myTeamId, challengedTeamId: targetId } }),
  });

  const m = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      toast.success("Desafio enviado");
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div>
          <Label>Desafiar equipe (mesma categoria)</Label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger><SelectValue placeholder="Escolha o adversário"/></SelectTrigger>
            <SelectContent>
              {candidates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} {t.rank_position ? `(#${t.rank_position})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {targetId && overlapsQ.isLoading && (
        <p className="text-sm text-muted-foreground">Buscando domingos em comum…</p>
      )}

      {targetId && overlapsQ.data && overlapsQ.data.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-sm">Nenhum domingo disponível em comum neste mês.</p>
        </Card>
      )}

      {targetId && overlapsQ.data && overlapsQ.data.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Horários coincidentes</p>
          {overlapsQ.data.map((o) => (
            <Card key={o.sunday_date} className="p-4 flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold">Domingo {formatSunday(o.sunday_date)}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3"/>{o.overlap_start.slice(0, 5)} às {o.overlap_end.slice(0, 5)}
                </div>
              </div>
              <Button
                size="sm"
                disabled={m.isPending}
                onClick={() =>
                  m.mutate({
                    data: {
                      challengerTeamId: myTeamId,
                      challengedTeamId: targetId,
                      date: o.sunday_date,
                      time: o.overlap_start.slice(0, 5),
                      arenaId: o.challenged_arena_id ?? o.challenger_arena_id ?? null,
                    },
                  })
                }
              >
                <Swords className="size-4 mr-1"/>Desafiar neste horário
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================================
type ChallengeRow = {
  id: string;
  status: string;
  scheduled_date: string;
  scheduled_time: string;
  reschedule_reason: string | null;
  challenger: { id: string; name: string; rank_position: number | null };
  challenged: { id: string; name: string; rank_position: number | null };
  arena: { id: string; name: string } | null;
};

function MyChallengesPanel({
  data,
  loading,
}: {
  data: { sent: ChallengeRow[]; received: ChallengeRow[] } | undefined;
  loading: boolean;
}) {
  const qc = useQueryClient();
  const respond = useServerFn(respondToChallenge);
  const m = useMutation({
    mutationFn: respond,
    onSuccess: () => {
      toast.success("Resposta enviada");
      qc.invalidateQueries({ queryKey: ["my-challenges"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-6">
      <Section title="Recebidos">
        {(data?.received ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum desafio recebido.</p>
        )}
        {data?.received.map((c) => (
          <Card key={c.id} className="p-4">
            <ChallengeHeader c={c}/>
            {c.status === "pending" && (
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={() => m.mutate({ data: { challengeId: c.id, action: "accept" } })}>
                  <Check className="size-4 mr-1"/>Aceitar
                </Button>
                <Button size="sm" variant="outline" onClick={() => m.mutate({ data: { challengeId: c.id, action: "reschedule" } })}>
                  <RotateCcw className="size-4 mr-1"/>Reagendar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => m.mutate({ data: { challengeId: c.id, action: "decline" } })}>
                  <X className="size-4 mr-1"/>Recusar
                </Button>
              </div>
            )}
          </Card>
        ))}
      </Section>

      <Section title="Enviados">
        {(data?.sent ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum desafio enviado.</p>
        )}
        {data?.sent.map((c) => (
          <Card key={c.id} className="p-4">
            <ChallengeHeader c={c}/>
          </Card>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function statusLabel(s: string) {
  switch (s) {
    case "pending": return { label: "Pendente", v: "secondary" as const };
    case "scheduled": return { label: "Agendado", v: "default" as const };
    case "reschedule_requested": return { label: "Reagendamento solicitado", v: "outline" as const };
    case "declined": return { label: "Recusado", v: "destructive" as const };
    case "completed": return { label: "Concluído", v: "default" as const };
    case "wo": return { label: "W.O.", v: "destructive" as const };
    default: return { label: s, v: "secondary" as const };
  }
}

function ChallengeHeader({ c }: { c: ChallengeRow }) {
  const s = statusLabel(c.status);
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="font-semibold">
          Domingo {formatSunday(c.scheduled_date)} — {c.scheduled_time.slice(0, 5)}
        </div>
        <div className="text-sm">
          {c.challenger.name} {c.challenger.rank_position ? `(#${c.challenger.rank_position})` : ""}
          {" "}vs{" "}
          {c.challenged.name} {c.challenged.rank_position ? `(#${c.challenged.rank_position})` : ""}
        </div>
        {c.arena && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="size-3"/>{c.arena.name}
          </div>
        )}
      </div>
      <Badge variant={s.v}>{s.label}</Badge>
    </div>
  );
}

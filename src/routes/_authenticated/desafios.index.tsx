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
  createChallenge, respondToChallenge, listMyChallenges,
  listCourts, getCourtAvailability, scheduleChallenge, reportWalkover,
} from "@/lib/ranking.functions";
import {
  CalendarDays, Swords, Plus, Clock, MapPin, Check, X, RotateCcw, Crown, Timer, AlertTriangle,
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
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-3xl">Desafios</h1>
            <p className="text-sm text-muted-foreground">
              Os jogos do ranking acontecem aos domingos. Defina a disponibilidade da sua equipe.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ChallengeRankingButton
              captainedTeams={captainedTeams}
              allTeams={teamsQ.data ?? []}
              onCreated={() => qc.invalidateQueries({ queryKey: ["my-challenges"] })}
            />
            <CreateTeamButton arenas={arenasQ.data ?? []} />
          </div>
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
type TeamLite = {
  id: string; name: string; category: string; gender?: string;
  rank_position: number | null; captain_id: string; points?: number;
};

function pointsDelta(myPos: number | null, targetPos: number | null): number {
  if (!myPos || !targetPos) return 30;
  const diff = myPos - targetPos;
  const d = 30 + diff * 5;
  return Math.max(10, Math.min(60, d));
}

type CatKey = "dupla" | "quarteto" | "dupla_mista" | "quarteto_misto";

const CATEGORY_OPTIONS: Array<{ key: CatKey; label: string; category: "dupla" | "quarteto"; gender?: "X" }> = [
  { key: "dupla", label: "Dupla", category: "dupla" },
  { key: "quarteto", label: "Quarteto", category: "quarteto" },
  { key: "dupla_mista", label: "Dupla Mista", category: "dupla", gender: "X" },
  { key: "quarteto_misto", label: "Quarteto Misto", category: "quarteto", gender: "X" },
];

function teamCategoryKey(t: { category: string; gender?: string }): CatKey | null {
  if (t.category === "dupla") return t.gender === "X" ? "dupla_mista" : "dupla";
  if (t.category === "quarteto") return t.gender === "X" ? "quarteto_misto" : "quarteto";
  return null;
}

function categoryLabel(t: { category: string; gender?: string }): string {
  const k = teamCategoryKey(t);
  return CATEGORY_OPTIONS.find((o) => o.key === k)?.label ?? t.category;
}

function ChallengeRankingButton({
  captainedTeams,
  allTeams,
  onCreated,
}: {
  captainedTeams: TeamLite[];
  allTeams: TeamLite[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [categoryKey, setCategoryKey] = useState<CatKey | "">("");
  const [teamId, setTeamId] = useState<string>("");
  const [targetId, setTargetId] = useState<string>("");
  const [sunday, setSunday] = useState<string>("");
  const [slot1, setSlot1] = useState<string>("");
  const createFn = useServerFn(createChallenge);

  const nextSundays = useMemo(() => {
    const out: string[] = [];
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    const offset = (7 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + offset);
    for (let i = 0; i < 8; i++) {
      out.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 7);
    }
    return out;
  }, []);

  const timeOptions = useMemo(() => {
    const out: string[] = [];
    for (let h = 8; h <= 16; h++) out.push(`${String(h).padStart(2, "0")}:00`);
    return out;
  }, []);

  const isCaptain = captainedTeams.length > 0;

  const teamsInCategory = useMemo(() => {
    if (!categoryKey) return captainedTeams;
    return captainedTeams.filter((t) => teamCategoryKey(t) === categoryKey);
  }, [captainedTeams, categoryKey]);

  const effectiveTeamId = teamId || teamsInCategory[0]?.id || "";
  const effectiveMyTeam =
    allTeams.find((t) => t.id === effectiveTeamId) ?? teamsInCategory.find((t) => t.id === effectiveTeamId);


  const candidates = useMemo(() => {
    if (!effectiveMyTeam) return [];
    const myPos = effectiveMyTeam.rank_position;
    return allTeams
      .filter((t) =>
        t.id !== effectiveMyTeam.id &&
        t.category === effectiveMyTeam.category &&
        (effectiveMyTeam.gender ? t.gender === effectiveMyTeam.gender : true) &&
        t.rank_position != null &&
        myPos != null &&
        t.rank_position >= myPos - 3 &&
        t.rank_position <= myPos + 2,
      )
      .sort((a, b) => (a.rank_position ?? 0) - (b.rank_position ?? 0));
  }, [allTeams, effectiveMyTeam]);

  const target = candidates.find((t) => t.id === targetId);
  const delta = pointsDelta(effectiveMyTeam?.rank_position ?? null, target?.rank_position ?? null);

  const m = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      toast.success("Desafio enviado. Aguarde a equipe aceitar para agendar.");
      setOpen(false); setTargetId(""); setSunday(""); setSlot1(""); setSlot2(""); setSlot3("");
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleClick = () => {
    if (!isCaptain) {
      toast.error("Somente capitães podem enviar desafios.");
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Button size="sm" onClick={handleClick}>
        <Swords className="size-4 mr-1"/>Desafiar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo desafio de ranking</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Categoria</Label>
              <Select
                value={categoryKey}
                onValueChange={(v) => { setCategoryKey(v as CatKey); setTeamId(""); setTargetId(""); }}
              >
                <SelectTrigger><SelectValue placeholder="Todas as categorias"/></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {teamsInCategory.length > 1 && (
              <div>
                <Label>Minha equipe</Label>
                <Select value={effectiveTeamId} onValueChange={(v) => { setTeamId(v); setTargetId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione sua equipe"/></SelectTrigger>
                  <SelectContent>
                    {teamsInCategory.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} — {categoryLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {effectiveMyTeam ? (
              <Card className="p-3 bg-secondary/40">
                <div className="text-xs text-muted-foreground">Minha equipe</div>
                <div className="font-semibold">{effectiveMyTeam.name}</div>
                <div className="text-xs">Categoria: {categoryLabel(effectiveMyTeam)}</div>
                <div className="text-xs">
                  Posição atual:{" "}
                  <strong>{effectiveMyTeam.rank_position ? `${effectiveMyTeam.rank_position}º` : "—"}</strong>
                  {typeof effectiveMyTeam.points === "number" ? ` · ${effectiveMyTeam.points} pts` : ""}
                </div>
              </Card>
            ) : (
              categoryKey && (
                <p className="text-xs text-muted-foreground">
                  Você não é capitão de nenhuma equipe nesta categoria.
                </p>
              )
            )}

            <div>
              <Label>Equipes disponíveis para desafiar</Label>
              <Select value={targetId} onValueChange={setTargetId} disabled={!effectiveMyTeam}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    !effectiveMyTeam
                      ? "Selecione a categoria primeiro"
                      : candidates.length === 0
                        ? "Nenhuma equipe elegível (até 3 acima / 2 abaixo)"
                        : "Escolha o adversário"
                  }/>
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.rank_position}º — {t.name}
                      {typeof t.points === "number" ? ` — ${t.points} pts` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Permitido: até 3 posições acima e até 2 abaixo, mesma categoria.
              </p>
            </div>


            {target && (
              <>
                <div>
                  <Label>Domingo do desafio</Label>
                  <Select value={sunday} onValueChange={setSunday}>
                    <SelectTrigger><SelectValue placeholder="Escolha o domingo"/></SelectTrigger>
                    <SelectContent>
                      {nextSundays.map((s) => (
                        <SelectItem key={s} value={s}>{formatSunday(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Horários sugeridos (3 opções)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: slot1, set: setSlot1, ph: "1ª opção" },
                      { v: slot2, set: setSlot2, ph: "2ª opção" },
                      { v: slot3, set: setSlot3, ph: "3ª opção" },
                    ].map((s, i) => (
                      <Select key={i} value={s.v} onValueChange={s.set}>
                        <SelectTrigger><SelectValue placeholder={s.ph}/></SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Janela permitida: 08:00 às 17:00. A equipe desafiada escolherá um dos horários.
                  </p>
                </div>

                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Pontuação estimada</div>
                  <div className="text-sm">Vitória: <strong className="text-primary">+{delta} pontos</strong></div>
                  <div className="text-sm">Derrota: <strong className="text-destructive">-{delta} pontos</strong></div>
                </Card>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              disabled={!targetId || !effectiveTeamId || !sunday || !slot1 || m.isPending}
              onClick={() => {
                const slots = [slot1, slot2, slot3].filter(Boolean);
                const unique = new Set(slots);
                if (unique.size !== slots.length) {
                  toast.error("Os horários devem ser diferentes.");
                  return;
                }
                m.mutate({
                  data: {
                    challengerTeamId: effectiveTeamId,
                    challengedTeamId: targetId,
                    date: sunday,
                    time: slot1,
                  },
                });
              }}
            >
              <Swords className="size-4 mr-1"/>Enviar desafio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
        <Button size="sm" variant="outline"><Plus className="size-4 mr-1"/>Criar equipe</Button>
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
              disabled={profilesQ.isLoading || others.length === 0 || selectedMembers.length >= required}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    profilesQ.isLoading
                      ? "Carregando perfis…"
                      : profilesQ.error
                        ? "Erro ao carregar perfis"
                        : others.length === 0
                          ? "Nenhum outro jogador cadastrado ainda"
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

            {!profilesQ.isLoading && others.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                Ainda não há outros jogadores cadastrados. Convide pessoas para criar conta em <code>/auth</code> e elas aparecerão aqui.
              </p>
            )}
            {profilesQ.error && (
              <p className="text-[11px] text-destructive">
                {(profilesQ.error as Error).message}
              </p>
            )}

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
  allTeams: Array<{ id: string; name: string; category: string; gender?: string; rank_position: number | null; captain_id: string }>;
  onCreated: () => void;
}) {
  const myTeam = allTeams.find((t) => t.id === myTeamId);
  const candidates = allTeams.filter(
    (t) =>
      t.id !== myTeamId &&
      t.category === myTeam?.category &&
      (myTeam?.gender ? t.gender === myTeam.gender : true),
  );
  const [targetId, setTargetId] = useState<string>("");
  const createFn = useServerFn(createChallenge);

  const m = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      toast.success("Desafio enviado. Aguarde a equipe aceitar para agendar.");
      setTargetId("");
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-4 space-y-3">
      <div>
        <Label>Equipe a desafiar</Label>
        <Select value={targetId} onValueChange={setTargetId}>
          <SelectTrigger><SelectValue placeholder="Escolha o adversário (mesma categoria)"/></SelectTrigger>
          <SelectContent>
            {candidates.length === 0 && (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                Nenhuma equipe compatível disponível.
              </div>
            )}
            {candidates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} {t.rank_position ? `(#${t.rank_position})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground mt-2">
          Após o aceite, você escolherá <strong>domingo, horário e quadra</strong> (08:00–17:00).
        </p>
      </div>
      <Button
        disabled={!targetId || m.isPending}
        onClick={() =>
          m.mutate({
            data: {
              challengerTeamId: myTeamId,
              challengedTeamId: targetId,
            },
          })
        }
      >
        <Swords className="size-4 mr-1"/>Enviar desafio
      </Button>
    </Card>
  );
}

// =====================================================================
type ChallengeRow = {
  id: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number | null;
  reschedule_reason: string | null;
  challenger: { id: string; name: string; rank_position: number | null };
  challenged: { id: string; name: string; rank_position: number | null };
  arena: { id: string; name: string } | null;
  court: { id: string; number: number; name: string } | null;
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
  const wo = useServerFn(reportWalkover);
  const respondM = useMutation({
    mutationFn: respond,
    onSuccess: () => { toast.success("Resposta enviada"); qc.invalidateQueries({ queryKey: ["my-challenges"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const woM = useMutation({
    mutationFn: wo,
    onSuccess: () => { toast.success("W.O. registrado"); qc.invalidateQueries({ queryKey: ["my-challenges"] }); },
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
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" onClick={() => respondM.mutate({ data: { challengeId: c.id, action: "accept" } })}>
                  <Check className="size-4 mr-1"/>Aceitar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => respondM.mutate({ data: { challengeId: c.id, action: "decline" } })}>
                  <X className="size-4 mr-1"/>Recusar
                </Button>
              </div>
            )}
            {c.status === "scheduled" && c.scheduled_date && isPast(c.scheduled_date, c.scheduled_time) && (
              <Button size="sm" variant="destructive" className="mt-3"
                onClick={() => woM.mutate({ data: { challengeId: c.id } })}>
                <AlertTriangle className="size-4 mr-1"/>Não compareceu (W.O.)
              </Button>
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
            {(c.status === "awaiting_schedule" || c.status === "reschedule_requested") && (
              <div className="mt-3">
                <ScheduleDialog challengeId={c.id} onScheduled={() => qc.invalidateQueries({ queryKey: ["my-challenges"] })}/>
              </div>
            )}
            {c.status === "scheduled" && c.scheduled_date && (
              <Countdown date={c.scheduled_date} time={c.scheduled_time}/>
            )}
          </Card>
        ))}
      </Section>
    </div>
  );
}

function isPast(date: string, time: string | null) {
  const dt = new Date(date + "T" + (time ?? "23:59") + ":00");
  return dt.getTime() < Date.now();
}

function Countdown({ date, time }: { date: string; time: string | null }) {
  const target = new Date(date + "T" + (time ?? "08:00") + ":00").getTime();
  const [now, setNow] = useState(Date.now());
  useMemo(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const diff = target - now;
  if (diff <= 0) return <p className="text-xs text-primary mt-2 flex items-center gap-1"><Timer className="size-3"/>Em andamento ou aguardando registro</p>;
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const min = Math.floor((diff % 3_600_000) / 60_000);
  return (
    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
      <Timer className="size-3"/>Em {d > 0 ? `${d}d ` : ""}{h}h {min}min
    </p>
  );
}

// =====================================================================
function ScheduleDialog({ challengeId, onScheduled }: { challengeId: string; onScheduled: () => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [courtId, setCourtId] = useState<string>("");

  const fetchAvail = useServerFn(getCourtAvailability);
  const scheduleFn = useServerFn(scheduleChallenge);

  const sundays = useMemo(() => nextSundays(8), []);
  const availQ = useQuery({
    enabled: open && !!date,
    queryKey: ["court-avail", date],
    queryFn: () => fetchAvail({ data: { date } }),
  });

  const m = useMutation({
    mutationFn: scheduleFn,
    onSuccess: () => {
      toast.success("Partida agendada — notificações enviadas");
      setOpen(false); setDate(""); setTime(""); setCourtId("");
      onScheduled();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const slotsByCourt = useMemo(() => {
    const map = new Map<string, { courtName: string; slots: Array<{ time: string; free: boolean }> }>();
    for (const row of (availQ.data ?? []) as Array<{ court_id: string; court_name: string; slot_time: string; is_free: boolean }>) {
      if (!map.has(row.court_id)) map.set(row.court_id, { courtName: row.court_name, slots: [] });
      map.get(row.court_id)!.slots.push({ time: row.slot_time.slice(0, 5), free: row.is_free });
    }
    return Array.from(map.entries());
  }, [availQ.data]);

  const selectedCourtSlots = courtId ? slotsByCourt.find(([id]) => id === courtId)?.[1].slots ?? [] : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><CalendarDays className="size-4 mr-1"/>Agendar partida</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Agendar desafio</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Domingo</Label>
            <Select value={date} onValueChange={(v) => { setDate(v); setCourtId(""); setTime(""); }}>
              <SelectTrigger><SelectValue placeholder="Escolha um domingo"/></SelectTrigger>
              <SelectContent>
                {sundays.map((s) => (
                  <SelectItem key={s} value={s}>{formatFullSunday(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {date && (
            <div>
              <Label>Quadra</Label>
              <Select value={courtId} onValueChange={(v) => { setCourtId(v); setTime(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder={availQ.isLoading ? "Carregando…" : "Escolha a quadra"}/>
                </SelectTrigger>
                <SelectContent>
                  {slotsByCourt.map(([id, info]) => {
                    const freeCount = info.slots.filter((s) => s.free).length;
                    return (
                      <SelectItem key={id} value={id} disabled={freeCount === 0}>
                        {info.courtName} — {freeCount} horário(s) livre(s)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {courtId && (
            <div>
              <Label>Horário (1h por partida)</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {selectedCourtSlots.map((s) => (
                  <Button
                    key={s.time}
                    type="button"
                    size="sm"
                    variant={time === s.time ? "default" : "outline"}
                    disabled={!s.free}
                    onClick={() => setTime(s.time)}
                  >
                    {s.time}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={!date || !time || !courtId || m.isPending}
            onClick={() => m.mutate({ data: { challengeId, date, time, courtId } })}
          >
            Confirmar agendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function nextSundays(count: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  for (let i = 0; i < count; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

function formatFullSunday(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
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
    case "awaiting_schedule": return { label: "Aguardando agendamento", v: "outline" as const };
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
          {c.scheduled_date
            ? `Domingo ${formatSunday(c.scheduled_date)}${c.scheduled_time ? ` — ${c.scheduled_time.slice(0, 5)}` : ""}`
            : "A agendar"}
        </div>
        <div className="text-sm">
          {c.challenger.name} {c.challenger.rank_position ? `(#${c.challenger.rank_position})` : ""}
          {" "}vs{" "}
          {c.challenged.name} {c.challenged.rank_position ? `(#${c.challenged.rank_position})` : ""}
        </div>
        {c.court && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="size-3"/>{c.court.name}
          </div>
        )}
      </div>
      <Badge variant={s.v}>{s.label}</Badge>
    </div>
  );
}

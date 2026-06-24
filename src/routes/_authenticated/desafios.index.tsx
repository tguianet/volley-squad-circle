import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  listTeams,
  getMyTeams,
  createChallenge,
  getCourtAvailability,
} from "@/lib/ranking.functions";
import {
  Users,
  Search,
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  ClipboardList,
  Trophy,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMyProfile } from "@/hooks/use-auth";
import { requiredTeamMemberCount } from "@/lib/team-format";


type CatKey = "dupla" | "quarteto" | "dupla_mista" | "quarteto_misto";
const CATEGORIES: Array<{ key: CatKey; label: string; category: "dupla" | "quarteto"; gender?: "X" }> = [
  { key: "dupla", label: "Dupla", category: "dupla" },
  { key: "quarteto", label: "Quarteto", category: "quarteto" },
  { key: "dupla_mista", label: "Dupla Mista", category: "dupla", gender: "X" },
  { key: "quarteto_misto", label: "Quarteto Misto", category: "quarteto", gender: "X" },
];

function teamCatKey(t: { category: string; gender?: string | null }): CatKey {
  if (t.category === "dupla") return t.gender === "X" ? "dupla_mista" : "dupla";
  return t.gender === "X" ? "quarteto_misto" : "quarteto";
}
function catLabel(t: { category: string; gender?: string | null }): string {
  return CATEGORIES.find((c) => c.key === teamCatKey(t))?.label ?? t.category;
}

export const Route = createFileRoute("/_authenticated/desafios/")({
  head: () => ({
    meta: [{ title: "Criar Desafio | PLAYBEACH" }],
  }),
  component: DesafiosPage,
});

type TeamLite = {
  id: string;
  name: string;
  category: string;
  gender?: string | null;
  rank_position: number | null;
  captain_id: string;
  points?: number | null;
  members?: Array<{ profile: { id: string; display_name: string | null; avatar_url: string | null } | null }>;
};

type CourtSlot = {
  court_id: string;
  court_number: number;
  court_name: string;
  slot_time: string;
  is_free: boolean;
};

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function levelFromRank(pos: number | null | undefined): string {
  if (!pos) return "—";
  if (pos <= 5) return "Pro";
  if (pos <= 15) return "Avançado";
  if (pos <= 30) return "Intermediário";
  return "Iniciante";
}

function DesafiosPage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const fetchTeams = useServerFn(listTeams);
  const fetchMyTeams = useServerFn(getMyTeams);
  const fetchAvail = useServerFn(getCourtAvailability);
  const create = useServerFn(createChallenge);

  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: () => fetchTeams() });
  const myTeamsQ = useQuery({ queryKey: ["my-teams"], queryFn: () => fetchMyTeams() });

  const captainedTeams = ((myTeamsQ.data ?? []) as TeamLite[]).filter(
    (t) => t.captain_id === userId,
  );

  const myProfileQ = useMyProfile();
  const myProfile = myProfileQ.data as
    | { id: string; display_name: string | null; avatar_url: string | null }
    | null
    | undefined;

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [categoryKey, setCategoryKey] = useState<CatKey | "">("");
  const [myTeamId, setMyTeamId] = useState<string>("");
  const [opponentId, setOpponentId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [courtId, setCourtId] = useState<string>("");
  const [search, setSearch] = useState("");

  const teamsInCategory = useMemo(() => {
    if (!categoryKey) return captainedTeams;
    return captainedTeams.filter((t) => teamCatKey(t) === categoryKey);
  }, [captainedTeams, categoryKey]);

  useEffect(() => {
    if (teamsInCategory[0] && !teamsInCategory.find((t) => t.id === myTeamId)) {
      setMyTeamId(teamsInCategory[0].id);
    }
  }, [teamsInCategory, myTeamId]);

  const myTeam = useMemo(
    () =>
      (teamsQ.data as TeamLite[] | undefined)?.find((t) => t.id === myTeamId) ??
      captainedTeams.find((t) => t.id === myTeamId),
    [teamsQ.data, captainedTeams, myTeamId],
  );

  // Enrich with members from teamsQ (which includes members)
  const myTeamFull = useMemo(() => {
    return (teamsQ.data as TeamLite[] | undefined)?.find((t) => t.id === myTeamId);
  }, [teamsQ.data, myTeamId]);

  const isCaptainOfSelected = !!myTeam && myTeam.captain_id === userId;




  type Candidate = TeamLite & { eligibility: "top5" | "above" | "below" };

  const candidates = useMemo<Candidate[]>(() => {
    if (!myTeam || myTeam.rank_position == null) return [];
    const all = (teamsQ.data as TeamLite[] | undefined) ?? [];
    const myPos = myTeam.rank_position;
    const myIsTop5 = myPos <= 5;
    const reqMembers = requiredTeamMemberCount(myTeam.category as "dupla" | "quarteto");

    return all
      .filter((t) => {
        if (t.id === myTeam.id) return false;
        if (t.category !== myTeam.category) return false;
        if (myTeam.gender ? t.gender !== myTeam.gender : false) return false;
        if (t.rank_position == null) return false;
        // completo (não suspenso/inativo já filtrado por is_active no listTeams)
        const memberCount = t.members?.length ?? 0;
        if (memberCount < reqMembers) return false;
        if (myIsTop5 && t.rank_position <= 5) return true;
        return t.rank_position >= myPos - 3 && t.rank_position <= myPos + 2;
      })
      .map((t) => {
        const pos = t.rank_position as number;
        let eligibility: Candidate["eligibility"];
        if (myIsTop5 && pos <= 5) eligibility = "top5";
        else if (pos < myPos) eligibility = "above";
        else eligibility = "below";
        return { ...t, eligibility };
      })
      .filter((t) => (search ? t.name.toLowerCase().includes(search.toLowerCase()) : true))
      .sort((a, b) => (a.rank_position ?? 0) - (b.rank_position ?? 0));
  }, [teamsQ.data, myTeam, search]);


  const opponent = useMemo(
    () => (teamsQ.data as TeamLite[] | undefined)?.find((t) => t.id === opponentId),
    [teamsQ.data, opponentId],
  );

  const nextSundays = useMemo(() => {
    const out: { iso: string; day: string; month: string }[] = [];
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    const offset = (7 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + offset);
    for (let i = 0; i < 6; i++) {
      out.push({
        iso: d.toISOString().slice(0, 10),
        day: String(d.getDate()).padStart(2, "0"),
        month: MONTHS[d.getMonth()],
      });
      d.setDate(d.getDate() + 7);
    }
    return out;
  }, []);

  const availQ = useQuery({
    queryKey: ["court-avail", date],
    queryFn: () => fetchAvail({ data: { date } }),
    enabled: !!date,
  });

  const slots = (availQ.data as CourtSlot[] | undefined) ?? [];

  const availableTimes = useMemo(() => {
    const set = new Set<string>();
    slots.forEach((s) => {
      if (s.is_free) set.add(s.slot_time.slice(0, 5));
    });
    return Array.from(set).sort();
  }, [slots]);

  const availableCourts = useMemo(() => {
    if (!time) return [];
    const m = new Map<string, CourtSlot>();
    slots.forEach((s) => {
      if (s.slot_time.slice(0, 5) === time && s.is_free) m.set(s.court_id, s);
    });
    return Array.from(m.values()).sort((a, b) => a.court_number - b.court_number);
  }, [slots, time]);

  const selectedCourt = availableCourts.find((c) => c.court_id === courtId);

  const sendM = useMutation({
    mutationFn: create,
    onSuccess: () => {
      toast.success("Desafio enviado! Quadra reservada.");
      qc.invalidateQueries({ queryKey: ["my-challenges"] });
      setStep(1);
      setOpponentId("");
      setDate("");
      setTime("");
      setCourtId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit = myTeamId && opponentId && date && time && courtId && !sendM.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    sendM.mutate({
      data: {
        challengerTeamId: myTeamId,
        challengedTeamId: opponentId,
        date,
        time,
        courtId,
      },
    });
  };

  const reset = () => {
    setStep(1);
    setOpponentId("");
    setDate("");
    setTime("");
    setCourtId("");
  };

  // Always include the logged-in user (captain) as the first athlete,
  // then any other team members.
  const players = useMemo(() => {
    const list: Array<{
      profile: { id: string; display_name: string | null; avatar_url: string | null } | null;
      isMe: boolean;
    }> = [];
    if (myProfile) {
      list.push({
        profile: {
          id: myProfile.id,
          display_name: myProfile.display_name ?? "Você",
          avatar_url: myProfile.avatar_url ?? null,
        },
        isMe: true,
      });
    }
    (myTeamFull?.members ?? []).forEach((m) => {
      if (!m.profile) return;
      if (m.profile.id === myProfile?.id) return;
      list.push({ profile: m.profile, isMe: false });
    });
    return list;
  }, [myProfile, myTeamFull]);

  if (!userId) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2">
            <Trophy className="size-6 text-primary" /> Criar Desafio
          </h1>
          <p className="text-sm text-muted-foreground">
            Desafie equipes do ranking e dispute posições.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex items-center gap-2 sm:gap-3">
              <div
                className={cn(
                  "size-8 sm:size-9 rounded-full grid place-items-center text-sm font-bold border-2 transition-colors",
                  step >= n
                    ? "bg-primary text-primary-foreground border-primary shadow-glow"
                    : "bg-card text-muted-foreground border-border",
                )}
              >
                {n}
              </div>
              {n < 5 && (
                <div
                  className={cn(
                    "h-0.5 w-4 sm:w-8 transition-colors",
                    step > n ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {captainedTeams.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="font-semibold mb-1">Você ainda não é capitão de nenhuma equipe</p>
            <p className="text-sm text-muted-foreground">
              Crie uma equipe para começar a desafiar.
            </p>
          </Card>
        ) : (
          <>
            {/* STEP 1 — My Team */}
            {step === 1 && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Users className="size-5" />
                  <h2 className="font-semibold">Minha Equipe</h2>
                </div>

                {/* My profile chip */}
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
                  <Avatar className="size-12">
                    <AvatarImage src={myProfile?.avatar_url ?? undefined} />
                    <AvatarFallback>{initials(myProfile?.display_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Meu perfil
                    </div>
                    <div className="font-semibold truncate">
                      {myProfile?.display_name ?? "Você"}
                    </div>
                  </div>
                </div>

                {/* Category pills — qual ranking vou desafiar */}
                <div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Qual ranking deseja desafiar?
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => {
                      const count = captainedTeams.filter((t) => teamCatKey(t) === c.key).length;
                      const active = categoryKey === c.key;
                      const disabled = count === 0;
                      return (
                        <button
                          key={c.key}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            setCategoryKey(active ? "" : c.key);
                            setMyTeamId("");
                            setOpponentId("");
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors",
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border hover:border-primary/40",
                            disabled && "opacity-40 cursor-not-allowed",
                          )}
                        >
                          {c.label}
                          {count > 0 && (
                            <span className="ml-1.5 text-[10px] opacity-70">({count})</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {teamsInCategory.length > 1 && (
                  <div>
                    <label className="text-xs text-muted-foreground">Selecione a equipe</label>
                    <Select value={myTeamId} onValueChange={setMyTeamId}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Escolha a equipe" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamsInCategory.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} — {catLabel(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {myTeam ? (
                  <>
                    <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="font-bold text-lg">{myTeam.name}</div>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">
                          {catLabel(myTeam)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Posição Atual:{" "}
                        <span className="text-primary font-semibold">
                          #{myTeam.rank_position ?? "—"}
                        </span>{" "}
                        | Nível:{" "}
                        <span className="text-primary font-semibold">
                          {levelFromRank(myTeam.rank_position)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {players.map((m, i) => (
                        <div
                          key={m.profile?.id ?? i}
                          className={cn(
                            "rounded-xl border p-3 text-center",
                            m.isMe ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card",
                          )}
                        >
                          <Avatar className="size-12 mx-auto mb-2">
                            <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                            <AvatarFallback>{initials(m.profile?.display_name)}</AvatarFallback>
                          </Avatar>
                          <div className="text-[10px] text-muted-foreground uppercase">
                            {m.isMe ? "Você" : `Atleta ${i + 1}`}
                          </div>
                          <div className="text-sm font-semibold truncate">
                            {m.profile?.display_name ?? "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {categoryKey
                      ? "Você não é capitão de nenhuma equipe nesta categoria."
                      : "Escolha uma categoria acima."}
                  </p>
                )}

                {myTeam && !isCaptainOfSelected && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    <ShieldAlert className="size-4 mt-0.5 shrink-0" />
                    <span>Somente o capitão pode criar desafios.</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!myTeam || !isCaptainOfSelected}
                  >
                    Continuar para Adversários
                  </Button>
                </div>
              </Card>
            )}


            {/* STEP 2 — Opponent */}
            {step === 2 && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="font-semibold">Escolha seu Adversário</h2>
                  <div className="relative">
                    <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar equipe"
                      className="h-9 rounded-xl border border-border/70 bg-card pl-8 pr-3 text-sm"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border/60">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Posição</th>
                        <th className="px-3 py-2 text-left">Equipe</th>
                        <th className="px-3 py-2 text-left">Nível</th>
                        <th className="px-3 py-2 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                            Nenhuma equipe elegível (até 3 acima / 2 abaixo).
                          </td>
                        </tr>
                      )}
                      {candidates.map((t) => (
                        <tr key={t.id} className="border-t border-border/40">
                          <td className="px-3 py-2 font-semibold">#{t.rank_position}</td>
                          <td className="px-3 py-2">{t.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {levelFromRank(t.rank_position)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant={opponentId === t.id ? "default" : "outline"}
                              onClick={() => {
                                setOpponentId(t.id);
                                setStep(3);
                              }}
                            >
                              {opponentId === t.id ? "Selecionado" : "Desafiar"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                    <ArrowLeft className="size-4 mr-1" /> Voltar
                  </Button>
                </div>
              </Card>
            )}

            {/* STEP 3 — Date */}
            {step === 3 && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <CalendarDays className="size-5" />
                  <h2 className="font-semibold">Selecione a Data (Domingos)</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {nextSundays.map((s) => (
                    <button
                      key={s.iso}
                      type="button"
                      onClick={() => {
                        setDate(s.iso);
                        setTime("");
                        setCourtId("");
                        setStep(4);
                      }}
                      className={cn(
                        "rounded-xl border-2 p-3 text-center transition-colors",
                        date === s.iso
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <div className="text-xs text-muted-foreground">{s.month}</div>
                      <div className="text-2xl font-bold">{s.day}</div>
                      <div className="text-[10px] text-muted-foreground">DOM</div>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                    <ArrowLeft className="size-4 mr-1" /> Voltar
                  </Button>
                  <Button size="sm" disabled={!date} onClick={() => setStep(4)}>
                    Próximo: Horário
                  </Button>
                </div>
              </Card>
            )}

            {/* STEP 4 — Time */}
            {step === 4 && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Clock className="size-5" />
                  <h2 className="font-semibold">Horários Disponíveis</h2>
                </div>
                {availQ.isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando horários…</p>
                ) : availableTimes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum horário livre neste domingo.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    {availableTimes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTime(t);
                          setCourtId("");
                          setStep(5);
                        }}
                        className={cn(
                          "rounded-xl border-2 py-3 font-semibold transition-colors",
                          time === t
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => setStep(3)}>
                    <ArrowLeft className="size-4 mr-1" /> Voltar
                  </Button>
                  <Button size="sm" disabled={!time} onClick={() => setStep(5)}>
                    Próximo: Quadra
                  </Button>
                </div>
              </Card>
            )}

            {/* STEP 5 — Court */}
            {step === 5 && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <MapPin className="size-5" />
                  <h2 className="font-semibold">Escolha a Quadra</h2>
                </div>
                {availableCourts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma quadra livre neste horário.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableCourts.map((c) => (
                      <button
                        key={c.court_id}
                        type="button"
                        onClick={() => setCourtId(c.court_id)}
                        className={cn(
                          "rounded-xl border-2 p-4 text-left transition-colors",
                          courtId === c.court_id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <div className="font-bold">{c.court_name}</div>
                        <div className="text-xs text-muted-foreground">Quadra {c.court_number}</div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => setStep(4)}>
                    <ArrowLeft className="size-4 mr-1" /> Voltar
                  </Button>
                </div>
              </Card>
            )}

            {/* RESUMO — fixo abaixo */}
            <Card className="p-5 space-y-4 border-primary/30">
              <div className="flex items-center gap-2 text-primary">
                <ClipboardList className="size-5" />
                <h2 className="font-semibold">Resumo do Desafio</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-4">
                {/* CASA */}
                <div className="text-center space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Casa
                  </div>
                  <Avatar className="size-14 mx-auto">
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                      {initials(myTeam?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="font-semibold text-sm">{myTeam?.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    #{myTeam?.rank_position ?? "—"}
                  </div>
                </div>

                <div className="text-center font-bold text-muted-foreground">VS</div>

                {/* VISITANTE */}
                <div className="text-center space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Visitante
                  </div>
                  <Avatar className="size-14 mx-auto">
                    <AvatarFallback
                      className={cn(
                        "font-bold",
                        opponent ? "bg-primary/20 text-primary" : "bg-secondary",
                      )}
                    >
                      {opponent ? initials(opponent.name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="font-semibold text-sm">{opponent?.name ?? "A definir"}</div>
                  <div className="text-xs text-muted-foreground">
                    {opponent?.rank_position ? `#${opponent.rank_position}` : "—"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-secondary/30 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" /> Data
                  </div>
                  <div className="font-semibold mt-1">
                    {date
                      ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "A definir"}
                  </div>
                </div>
                <div className="rounded-lg bg-secondary/30 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3.5" /> Horário
                  </div>
                  <div className="font-semibold mt-1">{time || "A definir"}</div>
                </div>
                <div className="rounded-lg bg-secondary/30 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" /> Quadra
                  </div>
                  <div className="font-semibold mt-1">
                    {selectedCourt?.court_name ?? "A definir"}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1"
                  variant="beach"
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                >
                  {sendM.isPending ? "Enviando…" : "Enviar Desafio"}
                </Button>
                <Button variant="outline" onClick={reset}>
                  Cancelar
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

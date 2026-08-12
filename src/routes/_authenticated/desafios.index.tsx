import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
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
  findCommonSundays,
  getAvailableChallengeCourts,
  listArenas,
} from "@/lib/ranking.functions";
import {
  Users,
  Search,
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  ShieldAlert,
  Star,
  Lock,
  Info,
  Volleyball,
  Check,
  ChevronDown,
  ChevronUp,
  Verified,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMyProfile } from "@/hooks/use-auth";
import { requiredTeamMemberCount } from "@/lib/team-format";
import { hourlyStartsWithinWindow } from "@/lib/challenge-scheduling";
import {
  CHALLENGE_INVALID_MESSAGE,
  canChallengeTeam,
  getChallengeEligibilityBadge,
  isTeamComplete,
  isUserTeamCaptain,
} from "@/lib/challenge-rules";
import { ChallengeStepIndicator } from "@/components/challenges/challenge-step-indicator";
import { ChallengeSummaryPanel } from "@/components/challenges/challenge-summary-panel";

type CatKey =
  | "dupla_masc"
  | "dupla_fem"
  | "dupla_mista"
  | "quarteto_masc"
  | "quarteto_fem"
  | "quarteto_misto";
const CATEGORIES: Array<{
  key: CatKey;
  label: string;
  category: "dupla" | "quarteto";
  gender: "M" | "F" | "X";
}> = [
  { key: "dupla_masc", label: "Dupla Masculina", category: "dupla", gender: "M" },
  { key: "dupla_fem", label: "Dupla Feminina", category: "dupla", gender: "F" },
  { key: "dupla_mista", label: "Dupla Mista", category: "dupla", gender: "X" },
  { key: "quarteto_masc", label: "Quarteto Masculino", category: "quarteto", gender: "M" },
  { key: "quarteto_fem", label: "Quarteto Feminino", category: "quarteto", gender: "F" },
  { key: "quarteto_misto", label: "Quarteto Misto", category: "quarteto", gender: "X" },
];

function teamCatKey(t: { category: string; gender?: string | null }): CatKey {
  if (t.category === "dupla") {
    if (t.gender === "X") return "dupla_mista";
    if (t.gender === "F") return "dupla_fem";
    return "dupla_masc";
  }
  if (t.gender === "X") return "quarteto_misto";
  if (t.gender === "F") return "quarteto_fem";
  return "quarteto_masc";
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
  members?: Array<{
    profile: { id: string; display_name: string | null; avatar_url: string | null } | null;
  }>;
};

type CourtSlot = {
  court_id: string;
  court_number: number;
  court_name: string;
};

type CommonSunday = {
  sunday_date: string;
  overlap_start: string;
  overlap_end: string;
  challenger_arena_id: string | null;
  challenged_arena_id: string | null;
};

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

function eligibilityMeta(eligibility: "top5" | "above" | "below") {
  if (eligibility === "top5") {
    return {
      label: "TOP 5",
      rowLabel: "Regra TOP 5",
      cls: "bg-accent/10 text-accent border-accent/20",
    };
  }
  if (eligibility === "above") {
    return {
      label: "3 acima",
      rowLabel: "Disputa de Subida",
      cls: "bg-accent/10 text-accent border-accent/20",
    };
  }
  return {
    label: "2 abaixo",
    rowLabel: "Defesa de Posição",
    cls: "bg-primary/10 text-primary border-primary/20",
  };
}

function DesafiosPage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const fetchTeams = useServerFn(listTeams);
  const fetchMyTeams = useServerFn(getMyTeams);
  const fetchCommonSundays = useServerFn(findCommonSundays);
  const fetchAvailableCourts = useServerFn(getAvailableChallengeCourts);
  const fetchArenas = useServerFn(listArenas);
  const create = useServerFn(createChallenge);

  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: () => fetchTeams() });
  const myTeamsQ = useQuery({ queryKey: ["my-teams"], queryFn: () => fetchMyTeams() });
  const arenasQ = useQuery({ queryKey: ["arenas"], queryFn: () => fetchArenas() });

  const allMyTeams = (myTeamsQ.data ?? []) as TeamLite[];

  const captainedTeams = allMyTeams.filter((t) => isUserTeamCaptain(t, userId));

  const memberOnlyTeams = allMyTeams.filter((t) => !isUserTeamCaptain(t, userId));

  const isTeamSelectable = useCallback(
    (t: TeamLite) => {
      const memberCount = t.members?.length ?? 0;
      return (
        isUserTeamCaptain(t, userId) &&
        isTeamComplete(t.category as "dupla" | "quarteto", memberCount) &&
        t.rank_position != null
      );
    },
    [userId],
  );

  const selectableCaptainedTeams = captainedTeams.filter(isTeamSelectable);

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
    if (!categoryKey) return selectableCaptainedTeams;
    return selectableCaptainedTeams.filter((t) => teamCatKey(t) === categoryKey);
  }, [selectableCaptainedTeams, categoryKey]);

  const memberOnlyInCategory = useMemo(() => {
    if (!categoryKey) return memberOnlyTeams;
    return memberOnlyTeams.filter((t) => teamCatKey(t) === categoryKey);
  }, [memberOnlyTeams, categoryKey]);

  const incompleteCaptainedInCategory = useMemo(() => {
    const incomplete = captainedTeams.filter((t) => !isTeamSelectable(t));
    if (!categoryKey) return incomplete;
    return incomplete.filter((t) => teamCatKey(t) === categoryKey);
  }, [captainedTeams, categoryKey, isTeamSelectable]);

  useEffect(() => {
    if (teamsInCategory[0] && !teamsInCategory.find((t) => t.id === myTeamId)) {
      setMyTeamId(teamsInCategory[0].id);
    }
    if (myTeamId && !teamsInCategory.find((t) => t.id === myTeamId)) {
      setMyTeamId(teamsInCategory[0]?.id ?? "");
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

  const isCaptainOfSelected = isUserTeamCaptain(myTeam ?? { captain_id: "" }, userId);

  const myTeamMemberCount = myTeamFull?.members?.length ?? myTeam?.members?.length ?? 0;
  const myTeamIsComplete =
    !!myTeam && isTeamComplete(myTeam.category as "dupla" | "quarteto", myTeamMemberCount);

  const canProceedWithChallenge =
    !!myTeam && isCaptainOfSelected && myTeamIsComplete && myTeam.rank_position != null;

  type Candidate = TeamLite & { eligibility: "top5" | "above" | "below" };

  const candidates = useMemo<Candidate[]>(() => {
    if (!myTeam || myTeam.rank_position == null || !canProceedWithChallenge) return [];
    const all = (teamsQ.data as TeamLite[] | undefined) ?? [];
    const myPos = myTeam.rank_position;
    const reqMembers = requiredTeamMemberCount(myTeam.category as "dupla" | "quarteto");

    return all
      .filter((t) => {
        if (t.id === myTeam.id) return false;
        if (t.category !== myTeam.category) return false;
        if (myTeam.gender ? t.gender !== myTeam.gender : false) return false;
        if (t.rank_position == null) return false;
        const memberCount = t.members?.length ?? 0;
        if (memberCount !== reqMembers) return false;
        return canChallengeTeam(myPos, t.rank_position);
      })
      .map((t) => {
        const pos = t.rank_position as number;
        const eligibility = getChallengeEligibilityBadge(myPos, pos) ?? "below";
        return { ...t, eligibility };
      })
      .filter((t) => (search ? t.name.toLowerCase().includes(search.toLowerCase()) : true))
      .sort((a, b) => (a.rank_position ?? 0) - (b.rank_position ?? 0));
  }, [teamsQ.data, myTeam, search, canProceedWithChallenge]);

  const opponent = useMemo(
    () => (teamsQ.data as TeamLite[] | undefined)?.find((t) => t.id === opponentId),
    [teamsQ.data, opponentId],
  );

  const commonSundaysQ = useQuery({
    queryKey: ["common-sundays", myTeamId, opponentId],
    queryFn: () =>
      fetchCommonSundays({
        data: { challengerTeamId: myTeamId, challengedTeamId: opponentId },
      }),
    enabled: !!myTeamId && !!opponentId,
  });

  const commonSundays = (commonSundaysQ.data ?? []) as CommonSunday[];
  const selectedOverlap = commonSundays.find((item) => item.sunday_date === date);
  const arenaId = selectedOverlap?.challenger_arena_id ?? "";
  const arenaName = (arenasQ.data ?? []).find((arena) => arena.id === arenaId)?.name;

  const availableTimes = useMemo(() => {
    if (!selectedOverlap) return [];
    return hourlyStartsWithinWindow(selectedOverlap.overlap_start, selectedOverlap.overlap_end);
  }, [selectedOverlap]);

  const courtsQ = useQuery({
    queryKey: ["challenge-courts", date, time, arenaId],
    queryFn: () => fetchAvailableCourts({ data: { date, time, arenaId } }),
    enabled: !!date && !!time && !!arenaId,
  });

  const availableCourts = useMemo(() => {
    return ((courtsQ.data ?? []) as CourtSlot[]).sort((a, b) => a.court_number - b.court_number);
  }, [courtsQ.data]);

  const selectedCourt = availableCourts.find((c) => c.court_id === courtId);

  const sendM = useMutation({
    mutationFn: create,
    onSuccess: () => {
      toast.success("Desafio enviado! Quadra pré-bloqueada até a resposta.");
      qc.invalidateQueries({ queryKey: ["my-challenges"] });
      setStep(1);
      setOpponentId("");
      setDate("");
      setTime("");
      setCourtId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const validateChallenge = (): boolean => {
    if (!canProceedWithChallenge || !myTeam || myTeam.rank_position == null) {
      toast.error(CHALLENGE_INVALID_MESSAGE);
      return false;
    }
    if (!opponent || opponent.rank_position == null) {
      toast.error(CHALLENGE_INVALID_MESSAGE);
      return false;
    }
    const reqMembers = requiredTeamMemberCount(myTeam.category as "dupla" | "quarteto");
    const opponentMemberCount = opponent.members?.length ?? 0;
    if (
      opponent.category !== myTeam.category ||
      opponent.gender !== myTeam.gender ||
      opponentMemberCount !== reqMembers ||
      !canChallengeTeam(myTeam.rank_position, opponent.rank_position)
    ) {
      toast.error(CHALLENGE_INVALID_MESSAGE);
      return false;
    }
    if (!date || !time || !courtId || !arenaId || !selectedOverlap) {
      toast.error(CHALLENGE_INVALID_MESSAGE);
      return false;
    }
    return true;
  };

  const canSubmit =
    canProceedWithChallenge &&
    !!opponentId &&
    !!date &&
    !!time &&
    !!courtId &&
    !!arenaId &&
    !sendM.isPending &&
    candidates.some((c) => c.id === opponentId);

  const handleSubmit = () => {
    if (!canSubmit || !validateChallenge()) return;
    sendM.mutate({
      data: {
        challengerTeamId: myTeamId,
        challengedTeamId: opponentId,
        date,
        time,
        courtId,
        arenaId,
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
        <div className="max-w-[1440px] mx-auto px-4 py-12">
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      </AppLayout>
    );
  }

  const summaryPanel = (
    <ChallengeSummaryPanel
      myTeamName={myTeam?.name}
      myTeamRank={myTeam?.rank_position}
      opponentName={opponent?.name}
      opponentRank={opponent?.rank_position}
      date={date}
      time={time}
      courtName={selectedCourt?.court_name}
      canSubmit={!!canSubmit}
      isPending={sendM.isPending}
      onSubmit={handleSubmit}
      onCancel={reset}
    />
  );

  return (
    <AppLayout>
      <div className="relative min-h-full">
        <div className="fixed inset-0 pointer-events-none -z-10 opacity-30">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-[1440px] mx-auto px-4 lg:px-10 py-6 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Coluna principal — wizard */}
            <div className="lg:col-span-8 space-y-6">
              <header>
                <h1 className="page-title text-3xl sm:text-4xl text-primary flex items-center gap-3">
                  🏆 Criar Desafio
                </h1>
                <p className="text-muted-foreground text-base sm:text-lg mt-2">
                  Desafie equipes do ranking e dispute posições seguindo as regras oficiais.
                </p>
              </header>

              {selectableCaptainedTeams.length > 0 && <ChallengeStepIndicator step={step} />}

              {selectableCaptainedTeams.length === 0 ? (
                <div className="challenge-panel p-8 sm:p-12 text-center max-w-2xl">
                  <div className="size-16 mx-auto mb-4 rounded-full bg-destructive/10 text-destructive grid place-items-center">
                    <Lock className="size-8" />
                  </div>
                  <p className="font-display text-xl font-bold mb-2">
                    Você precisa ser capitão de um time completo para criar desafios.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {captainedTeams.length > 0
                      ? "Complete a formação da sua equipe para liberar os desafios."
                      : "Crie uma equipe ou torne-se capitão para começar a desafiar."}
                  </p>
                </div>
              ) : (
                <>
                  {/* STEP 1 */}
                  {step === 1 && (
                    <section className="challenge-panel p-5 sm:p-6 space-y-5">
                      <div className="flex items-center gap-2 text-primary">
                        <Users className="size-5" />
                        <h2 className="font-display text-xl font-bold tracking-wide">
                          Minha Equipe
                        </h2>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-2 font-medium">
                          Qual ranking deseja desafiar?
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {CATEGORIES.map((c) => {
                            const count = selectableCaptainedTeams.filter(
                              (t) => teamCatKey(t) === c.key,
                            ).length;
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
                                  "coastal-pill border-2 transition-all",
                                  active
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-card border-border hover:border-primary/40",
                                  disabled && "opacity-40 cursor-not-allowed",
                                )}
                              >
                                {c.label}
                                {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {teamsInCategory.length > 1 && (
                        <div>
                          <label className="text-xs text-muted-foreground font-medium">
                            Selecione a equipe
                          </label>
                          <Select value={myTeamId} onValueChange={setMyTeamId}>
                            <SelectTrigger className="mt-1 rounded-xl">
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

                      {myTeam && (
                        <div className="challenge-glass rounded-xl border-l-4 border-l-primary p-5 relative overflow-hidden">
                          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 flex items-center gap-1 rounded-bl-lg">
                            <Star className="size-3 fill-current" />
                            VOCÊ É O CAPITÃO
                          </div>
                          <div className="flex gap-4 items-start pr-24">
                            <div className="size-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <Volleyball className="size-8 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-display text-xl font-bold">{myTeam.name}</h3>
                                <span className="coastal-pill bg-primary/10 text-primary border-0">
                                  {catLabel(myTeam)}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Posição atual:{" "}
                                <span className="font-bold text-accent">
                                  #{myTeam.rank_position ?? "—"}
                                </span>
                                <span className="mx-2">·</span>
                                Nível:{" "}
                                <span className="font-bold text-primary">
                                  {levelFromRank(myTeam.rank_position)}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {players.map((m, i) => (
                              <div
                                key={m.profile?.id ?? i}
                                className={cn(
                                  "p-3 rounded-lg border",
                                  m.isMe
                                    ? "bg-primary/5 border-primary/25"
                                    : "bg-muted/30 border-border/60",
                                )}
                              >
                                <p
                                  className={cn(
                                    "text-[10px] font-bold uppercase mb-1 flex items-center gap-1",
                                    m.isMe ? "text-primary" : "text-muted-foreground",
                                  )}
                                >
                                  {m.isMe && <Star className="size-3 fill-current" />}
                                  {m.isMe ? "Capitão" : `Atleta ${i + 1}`}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Avatar className="size-8">
                                    <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                                    <AvatarFallback className="text-xs">
                                      {initials(m.profile?.display_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <p className="font-bold text-sm truncate">
                                    {m.profile?.display_name ?? "—"}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {myTeamIsComplete && (
                            <div className="mt-4 p-3 bg-primary/5 border border-primary/15 rounded-lg flex items-start gap-2">
                              <Info className="size-4 text-primary shrink-0 mt-0.5" />
                              <p className="text-sm text-muted-foreground">
                                Sua equipe está completa e apta a realizar desafios no ranking.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {!myTeam && categoryKey && (
                        <p className="text-sm text-muted-foreground">
                          Selecione um time completo que você capitaneia nesta categoria.
                        </p>
                      )}
                      {!categoryKey && (
                        <p className="text-sm text-muted-foreground">
                          Escolha uma categoria acima.
                        </p>
                      )}

                      {incompleteCaptainedInCategory.map((t) => (
                        <div
                          key={t.id}
                          className="p-4 border border-dashed border-border rounded-xl opacity-90"
                        >
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                              <Users className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-bold text-sm">{t.name}</p>
                              <p className="text-xs text-destructive font-medium">
                                Time incompleto ({t.members?.length ?? 0}/
                                {requiredTeamMemberCount(t.category as "dupla" | "quarteto")}{" "}
                                membros)
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {memberOnlyInCategory.map((t) => (
                        <div
                          key={t.id}
                          className="p-4 bg-muted/40 border border-border/60 rounded-xl opacity-75"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                              <Lock className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-bold text-sm">
                                {t.name} ({catLabel(t)})
                              </p>
                              <p className="text-xs text-muted-foreground">
                                #{t.rank_position ?? "—"} no ranking
                              </p>
                            </div>
                          </div>
                          <div className="bg-destructive/10 text-destructive text-[11px] font-bold p-2 rounded flex items-center gap-2">
                            <Info className="size-3.5 shrink-0" />
                            Você participa deste time, mas não é o capitão.
                          </div>
                        </div>
                      ))}

                      <div className="flex justify-end pt-2">
                        <Button
                          size="lg"
                          className="rounded-xl font-bold px-8"
                          onClick={() => setStep(2)}
                          disabled={!canProceedWithChallenge}
                        >
                          Continuar para Adversários
                        </Button>
                      </div>
                    </section>
                  )}

                  {/* STEP 2 */}
                  {step === 2 && (
                    <section className="challenge-panel overflow-hidden">
                      {!canProceedWithChallenge ? (
                        <div className="p-6 space-y-4">
                          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                            <ShieldAlert className="size-4 mt-0.5 shrink-0" />
                            <span>Somente o capitão pode criar desafios por este time.</span>
                          </div>
                          <Button variant="outline" onClick={() => setStep(1)}>
                            <ArrowLeft className="size-4 mr-1" /> Voltar
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="p-5 sm:p-6 border-b border-border/50 bg-muted/30 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <h2 className="font-display text-xl font-bold">
                                  Escolha seu Adversário
                                </h2>
                                {myTeam && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {myTeam.name} · #{myTeam.rank_position ?? "—"}
                                    {myTeam.rank_position != null && myTeam.rank_position <= 5
                                      ? " · TOP 5"
                                      : " · até 3 acima / 2 abaixo"}
                                  </p>
                                )}
                              </div>
                              <div className="relative">
                                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                  value={search}
                                  onChange={(e) => setSearch(e.target.value)}
                                  placeholder="Buscar equipe..."
                                  className="h-10 w-full sm:w-64 rounded-full border border-border bg-card pl-9 pr-4 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                                />
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="coastal-pill bg-accent/10 text-accent border border-accent/20">
                                Até 3 posições acima
                              </span>
                              <span className="coastal-pill bg-primary/10 text-primary border border-primary/20">
                                Até 2 posições abaixo
                              </span>
                              <span className="coastal-pill bg-muted text-muted-foreground border border-border">
                                Top 5 Exclusivo
                              </span>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
                                  <th className="px-4 sm:px-6 py-3 text-left font-bold">Posição</th>
                                  <th className="px-4 sm:px-6 py-3 text-left font-bold">Equipe</th>
                                  <th className="px-4 sm:px-6 py-3 text-left font-bold hidden sm:table-cell">
                                    Status
                                  </th>
                                  <th className="px-4 sm:px-6 py-3 text-right font-bold">Ação</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/40">
                                {candidates.length === 0 && (
                                  <tr>
                                    <td
                                      colSpan={4}
                                      className="px-6 py-10 text-center text-muted-foreground"
                                    >
                                      Nenhuma equipe elegível para desafio no momento.
                                    </td>
                                  </tr>
                                )}
                                {candidates.map((t) => {
                                  const meta = eligibilityMeta(t.eligibility);
                                  const selected = opponentId === t.id;
                                  const captain = t.members?.find(
                                    (m) => m.profile?.id === t.captain_id,
                                  )?.profile;
                                  return (
                                    <tr
                                      key={t.id}
                                      className={cn(
                                        "hover:bg-primary/5 transition-colors",
                                        selected && "bg-primary/5 border-l-4 border-l-primary",
                                      )}
                                    >
                                      <td className="px-4 sm:px-6 py-4">
                                        <div
                                          className={cn(
                                            "size-8 rounded-full font-bold text-sm grid place-items-center border",
                                            t.eligibility === "top5"
                                              ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                                              : t.eligibility === "above"
                                                ? "bg-accent/10 text-accent border-accent/20"
                                                : "bg-primary/10 text-primary border-primary/20",
                                          )}
                                        >
                                          {t.rank_position}
                                        </div>
                                      </td>
                                      <td className="px-4 sm:px-6 py-4">
                                        <p className="font-bold">{t.name}</p>
                                        <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                                          {captain?.display_name ?? "—"} · {t.members?.length ?? 0}{" "}
                                          jog.
                                        </p>
                                        <span
                                          className={cn(
                                            "sm:hidden inline-flex mt-1 coastal-pill border text-[10px]",
                                            meta.cls,
                                          )}
                                        >
                                          {meta.label}
                                        </span>
                                      </td>
                                      <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                                        <span
                                          className={cn(
                                            "inline-flex items-center gap-1 coastal-pill border text-[10px]",
                                            meta.cls,
                                          )}
                                        >
                                          {t.eligibility === "top5" && (
                                            <Verified className="size-3" />
                                          )}
                                          {t.eligibility === "above" && (
                                            <ChevronUp className="size-3" />
                                          )}
                                          {t.eligibility === "below" && (
                                            <ChevronDown className="size-3" />
                                          )}
                                          {meta.rowLabel}
                                        </span>
                                      </td>
                                      <td className="px-4 sm:px-6 py-4 text-right">
                                        <Button
                                          size="sm"
                                          variant={selected ? "beach" : "outline"}
                                          className={cn(
                                            "rounded-lg font-bold",
                                            !selected &&
                                              "border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground",
                                          )}
                                          onClick={() => setOpponentId(t.id)}
                                        >
                                          {selected ? (
                                            <>
                                              <Check className="size-3.5 mr-1" /> Selecionado
                                            </>
                                          ) : (
                                            "Desafiar"
                                          )}
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <div className="p-5 sm:p-6 flex justify-between gap-3 border-t border-border/40">
                            <Button variant="ghost" onClick={() => setStep(1)}>
                              <ArrowLeft className="size-4 mr-1" /> Voltar
                            </Button>
                            <Button disabled={!opponentId} onClick={() => setStep(3)}>
                              Próximo: Data
                            </Button>
                          </div>
                        </>
                      )}
                    </section>
                  )}

                  {/* STEP 3 */}
                  {step === 3 && (
                    <section className="challenge-panel p-5 sm:p-6 space-y-5">
                      {!canProceedWithChallenge || !opponentId ? (
                        <BlockedStep onBack={() => setStep(1)} />
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-primary">
                            <CalendarDays className="size-5" />
                            <h2 className="font-display text-xl font-bold">
                              Selecione a Data (Domingos)
                            </h2>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Mostramos somente domingos em que as duas equipes escolheram a mesma
                            arena e possuem horários compatíveis.
                          </p>
                          {commonSundaysQ.isLoading ? (
                            <p className="text-sm text-muted-foreground">Cruzando agendas…</p>
                          ) : commonSundays.length === 0 ? (
                            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                              Não há domingo compatível nos próximos três meses. Os capitães devem
                              revisar a disponibilidade mensal.
                            </div>
                          ) : (
                            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                              {commonSundays.map((s) => {
                                const sunday = new Date(`${s.sunday_date}T12:00:00`);
                                return (
                                  <button
                                    key={s.sunday_date}
                                    type="button"
                                    onClick={() => {
                                      setDate(s.sunday_date);
                                      setTime("");
                                      setCourtId("");
                                    }}
                                    className={cn(
                                      "shrink-0 w-24 h-32 rounded-xl border-2 flex flex-col items-center justify-center transition-all group",
                                      date === s.sunday_date
                                        ? "border-primary bg-primary/10 shadow-md"
                                        : "border-border hover:border-primary/50 hover:bg-primary/5",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "text-xs uppercase font-bold",
                                        date === s.sunday_date
                                          ? "text-primary"
                                          : "text-muted-foreground group-hover:text-primary",
                                      )}
                                    >
                                      {sunday.toLocaleDateString("pt-BR", { month: "short" })}
                                    </span>
                                    <span
                                      className={cn(
                                        "text-3xl font-display font-bold my-1",
                                        date === s.sunday_date && "text-primary",
                                      )}
                                    >
                                      {String(sunday.getDate()).padStart(2, "0")}
                                    </span>
                                    <span className="text-xs font-semibold text-accent">DOM</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {selectedOverlap ? (
                            <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 text-sm">
                              <strong>{arenaName ?? "Arena selecionada"}</strong> · janela comum das{" "}
                              {selectedOverlap.overlap_start.slice(0, 5)} às{" "}
                              {selectedOverlap.overlap_end.slice(0, 5)}
                            </div>
                          ) : null}
                          <div className="flex justify-between gap-3 pt-2">
                            <Button variant="ghost" onClick={() => setStep(2)}>
                              <ArrowLeft className="size-4 mr-1" /> Voltar
                            </Button>
                            <Button disabled={!date} onClick={() => setStep(4)}>
                              Próximo: Horário
                            </Button>
                          </div>
                        </>
                      )}
                    </section>
                  )}

                  {/* STEP 4 */}
                  {step === 4 && (
                    <section className="challenge-panel p-5 sm:p-6 space-y-5">
                      {!canProceedWithChallenge || !opponentId || !date ? (
                        <BlockedStep onBack={() => setStep(1)} />
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-primary">
                            <Clock className="size-5" />
                            <h2 className="font-display text-xl font-bold">Horários Disponíveis</h2>
                          </div>
                          {availableTimes.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Nenhum horário livre neste domingo.
                            </p>
                          ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                              {availableTimes.map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => {
                                    setTime(t);
                                    setCourtId("");
                                  }}
                                  className={cn(
                                    "py-3 px-2 rounded-lg border-2 font-bold text-sm transition-all",
                                    time === t
                                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                                      : "border-border bg-card hover:border-primary/50 hover:bg-primary/5",
                                  )}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="flex justify-between gap-3 pt-2">
                            <Button variant="ghost" onClick={() => setStep(3)}>
                              <ArrowLeft className="size-4 mr-1" /> Voltar
                            </Button>
                            <Button disabled={!time} onClick={() => setStep(5)}>
                              Próximo: Quadra
                            </Button>
                          </div>
                        </>
                      )}
                    </section>
                  )}

                  {/* STEP 5 */}
                  {step === 5 && (
                    <section className="challenge-panel p-5 sm:p-6 space-y-5">
                      {!canProceedWithChallenge || !opponentId || !date || !time ? (
                        <BlockedStep onBack={() => setStep(1)} />
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-primary">
                            <MapPin className="size-5" />
                            <h2 className="font-display text-xl font-bold">Escolha a Quadra</h2>
                          </div>
                          {courtsQ.isLoading ? (
                            <p className="text-sm text-muted-foreground">Consultando quadras…</p>
                          ) : availableCourts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Nenhuma quadra livre neste horário.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {availableCourts.map((c) => {
                                const selected = courtId === c.court_id;
                                return (
                                  <button
                                    key={c.court_id}
                                    type="button"
                                    onClick={() => setCourtId(c.court_id)}
                                    className={cn(
                                      "text-left rounded-xl overflow-hidden border-2 transition-all bg-card",
                                      selected
                                        ? "border-primary shadow-lg ring-2 ring-primary/20"
                                        : "border-border hover:border-primary/50",
                                    )}
                                  >
                                    <div className="relative h-36 bg-gradient-to-br from-primary/20 via-accent/10 to-muted">
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                      {selected && (
                                        <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] px-2 py-1 rounded font-bold flex items-center gap-1">
                                          <span className="size-1.5 bg-white rounded-full animate-pulse" />
                                          SELECIONADA
                                        </div>
                                      )}
                                      <div className="absolute bottom-3 left-3 text-white">
                                        <p className="font-bold text-lg">{c.court_name}</p>
                                        <p className="text-[10px] uppercase font-bold tracking-widest opacity-80">
                                          Quadra {c.court_number}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="p-3 flex justify-between items-center">
                                      <p className="text-xs text-muted-foreground">
                                        Disponível neste horário
                                      </p>
                                      {selected && <Check className="size-5 text-primary" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          <div className="flex justify-start pt-2">
                            <Button variant="ghost" onClick={() => setStep(4)}>
                              <ArrowLeft className="size-4 mr-1" /> Voltar
                            </Button>
                          </div>
                        </>
                      )}
                    </section>
                  )}

                  {/* Resumo mobile — abaixo do wizard */}
                  <div className="lg:hidden space-y-4">
                    {summaryPanel}
                    <InfoFooter />
                  </div>
                </>
              )}
            </div>

            {/* Sidebar desktop */}
            {selectableCaptainedTeams.length > 0 && (
              <aside className="hidden lg:block lg:col-span-4">
                <div className="sticky top-24 space-y-4">
                  {summaryPanel}
                  <InfoFooter />
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function BlockedStep({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        <ShieldAlert className="size-4 mt-0.5 shrink-0" />
        <span>{CHALLENGE_INVALID_MESSAGE}</span>
      </div>
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="size-4 mr-1" /> Voltar
      </Button>
    </div>
  );
}

function InfoFooter() {
  return (
    <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
      <Info className="size-4 text-primary shrink-0 mt-0.5" />
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        O time desafiado terá até 24h antes do horário marcado para confirmar ou solicitar
        alteração. O não comparecimento resulta em W.O. e penalidade no ranking.
      </p>
    </div>
  );
}

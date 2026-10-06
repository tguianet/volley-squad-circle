import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  cancelScheduledChallenge,
  createChallenge,
  getAvailableChallengeCourts,
  getMyTeams,
  listArenas,
  listMyChallenges,
  listTeams,
  proposeChallengeReschedule,
  respondToChallenge,
  respondToChallengeReschedule,
} from "@/lib/ranking.functions";
import {
  fetchPendingChallengeInvite,
  type PendingChallengeInvite,
} from "@/lib/challenge-invite.queries";
import { canChallengeTeam, isTeamComplete, isUserTeamCaptain } from "@/lib/challenge-rules";
import { requiredTeamMemberCount } from "@/lib/team-format";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  RefreshCw,
  Trophy,
  Users,
  Volleyball,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/desafios/")({
  head: () => ({ meta: [{ title: "Desafios | PLAYBEACH" }] }),
  component: DesafiosPage,
});

type TeamLite = {
  id: string;
  name: string;
  category: "dupla" | "quarteto";
  gender: "M" | "F" | "X";
  rank_position: number | null;
  captain_id: string;
  is_active?: boolean | null;
  members?: Array<{
    profile: {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  }>;
};

type ArenaLite = {
  id: string;
  name: string;
  city: string | null;
};

type CourtSlot = {
  court_id: string;
  court_number: number;
  court_name: string;
};

type ChallengeLite = {
  id: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  arena_id: string | null;
  proposed_date: string | null;
  proposed_time: string | null;
  proposed_arena_id: string | null;
  proposed_court_id: string | null;
  reschedule_proposed_by: string | null;
  reschedule_reason: string | null;
  challenger_proposal_count?: number | null;
  challenged_proposal_count?: number | null;
  challenger: { id: string; name: string; rank_position: number | null };
  challenged: { id: string; name: string; rank_position: number | null };
  arena: { id: string; name: string } | null;
  court: { id: string; number: number; name: string } | null;
  proposed_arena: { id: string; name: string } | null;
  proposed_court: { id: string; number: number; name: string } | null;
};

type FlowStep = "team" | "opponent" | "schedule" | "sent";

type ScheduleValue = {
  arenaId: string;
  date: string;
  time: string;
  courtId: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${date}T12:00:00`));
}

function upcomingSundays(count = 8) {
  const dates: string[] = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1);

  while (dates.length < count) {
    if (cursor.getDay() === 0) {
      dates.push(
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
          cursor.getDate(),
        ).padStart(2, "0")}`,
      );
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatTeamType(team: Pick<TeamLite, "category" | "gender">) {
  const size = team.category === "quarteto" ? "Quarteto" : "Dupla";
  const gender = team.gender === "M" ? "Masculino" : team.gender === "F" ? "Feminino" : "Misto";
  return `${size} ${gender}`;
}

function TeamAvatar({ team }: { team: TeamLite }) {
  const first = team.members?.find((member) => member.profile)?.profile;
  return (
    <Avatar className="size-12 border">
      {first?.avatar_url ? <AvatarImage src={first.avatar_url} /> : null}
      <AvatarFallback>{initials(team.name)}</AvatarFallback>
    </Avatar>
  );
}

function FlowHeader({ step }: { step: FlowStep }) {
  const items = [
    { id: "team" as const, label: "Seu time" },
    { id: "opponent" as const, label: "Adversário" },
    { id: "schedule" as const, label: "Marcar jogo" },
  ];
  const stepIndex = step === "sent" ? 3 : items.findIndex((item) => item.id === step);

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item, index) => {
        const active = item.id === step;
        const done = index < stepIndex || step === "sent";
        return (
          <div key={item.id} className="min-w-0">
            <div
              className={cn("mb-2 h-1.5 rounded-full", done || active ? "bg-primary" : "bg-muted")}
            />
            <div
              className={cn(
                "truncate text-xs font-medium sm:text-sm",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {index + 1}. {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SchedulePicker({
  queryKey,
  arenas,
  value,
  onChange,
}: {
  queryKey: string;
  arenas: ArenaLite[];
  value: ScheduleValue;
  onChange: (next: ScheduleValue) => void;
}) {
  const fetchCourts = useServerFn(getAvailableChallengeCourts);
  const dates = useMemo(() => upcomingSundays(8), []);
  const times = useMemo(
    () => ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"],
    [],
  );

  const courtsQ = useQuery({
    queryKey: [queryKey, value.arenaId, value.date, value.time],
    queryFn: () =>
      fetchCourts({
        data: {
          arenaId: value.arenaId,
          date: value.date,
          time: value.time,
        },
      }),
    enabled: !!value.arenaId && !!value.date && !!value.time,
  });

  const courts = ((courtsQ.data ?? []) as CourtSlot[]).sort(
    (a, b) => a.court_number - b.court_number,
  );

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center gap-2 font-medium">
          <MapPin className="size-4 text-primary" />
          Arena
        </div>
        {arenas.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Nenhuma arena ativa disponível.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {arenas.map((arena) => (
              <Button
                key={arena.id}
                type="button"
                variant={value.arenaId === arena.id ? "default" : "outline"}
                className="justify-start"
                onClick={() =>
                  onChange({
                    arenaId: arena.id,
                    date: "",
                    time: "",
                    courtId: "",
                  })
                }
              >
                <MapPin className="mr-2 size-4" />
                <span className="truncate">
                  {arena.name}
                  {arena.city ? ` · ${arena.city}` : ""}
                </span>
              </Button>
            ))}
          </div>
        )}
      </div>

      {value.arenaId ? (
        <div>
          <div className="mb-2 flex items-center gap-2 font-medium">
            <CalendarDays className="size-4 text-primary" />
            Data
          </div>
          <div className="flex flex-wrap gap-2">
            {dates.map((date) => (
              <Button
                key={date}
                type="button"
                variant={value.date === date ? "default" : "outline"}
                onClick={() =>
                  onChange({
                    ...value,
                    date,
                    time: "",
                    courtId: "",
                  })
                }
              >
                {formatDate(date)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {value.date ? (
        <div>
          <div className="mb-2 flex items-center gap-2 font-medium">
            <Clock className="size-4 text-primary" />
            Horário
          </div>
          <div className="flex flex-wrap gap-2">
            {times.map((time) => (
              <Button
                key={time}
                type="button"
                variant={value.time === time ? "default" : "outline"}
                onClick={() =>
                  onChange({
                    ...value,
                    time,
                    courtId: "",
                  })
                }
              >
                {time}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {value.date && value.time ? (
        <div>
          <div className="mb-2 flex items-center gap-2 font-medium">
            <Volleyball className="size-4 text-primary" />
            Quadra livre
          </div>
          {courtsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Buscando quadras livres…</p>
          ) : courts.length === 0 ? (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Nenhuma quadra livre neste horário.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {courts.map((court) => (
                <Button
                  key={court.court_id}
                  type="button"
                  variant={value.courtId === court.court_id ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => onChange({ ...value, courtId: court.court_id })}
                >
                  <Volleyball className="mr-2 size-4" />
                  {court.court_name}
                </Button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function PendingInviteCard({
  invite,
  onAccept,
  onCounter,
  onDecline,
  pending,
}: {
  invite: PendingChallengeInvite;
  onAccept: () => void;
  onCounter: () => void;
  onDecline: () => void;
  pending: boolean;
}) {
  return (
    <Card className="border-primary/30 bg-primary/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10">
          <Volleyball className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">
            Você recebeu um desafio
          </div>
          <div className="mt-0.5 font-semibold">
            {invite.challenger.name} x {invite.challenged.name}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {invite.scheduled_date ? formatDate(invite.scheduled_date) : ""}
            {invite.scheduled_time ? ` · ${invite.scheduled_time.slice(0, 5)}` : ""}
            {invite.arena ? ` · ${invite.arena.name}` : ""}
            {invite.court ? ` · ${invite.court.name}` : ""}
          </div>
        </div>
        {invite.isCaptain ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onAccept} disabled={pending}>
              <Check className="mr-1.5 size-4" />
              Aceitar
            </Button>
            <Button size="sm" variant="outline" onClick={onCounter} disabled={pending}>
              <RefreshCw className="mr-1.5 size-4" />
              Outro horário
            </Button>
            <Button size="sm" variant="outline" onClick={onDecline} disabled={pending}>
              <X className="mr-1.5 size-4" />
              Recusar
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function DesafiosPage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState<FlowStep>("team");
  const [myTeamId, setMyTeamId] = useState("");
  const [opponentId, setOpponentId] = useState("");
  const [schedule, setSchedule] = useState<ScheduleValue>({
    arenaId: "",
    date: "",
    time: "",
    courtId: "",
  });

  const [counterChallengeId, setCounterChallengeId] = useState("");
  const [counterSchedule, setCounterSchedule] = useState<ScheduleValue>({
    arenaId: "",
    date: "",
    time: "",
    courtId: "",
  });
  const [counterReason, setCounterReason] = useState("");

  const [cancelChallengeId, setCancelChallengeId] = useState("");
  const [cancelReason, setCancelReason] = useState<
    "weather" | "arena_unavailable" | "injury" | "personal" | "other"
  >("personal");
  const [cancelNote, setCancelNote] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const fetchMyTeams = useServerFn(getMyTeams);
  const fetchTeams = useServerFn(listTeams);
  const fetchArenas = useServerFn(listArenas);
  const fetchMyChallenges = useServerFn(listMyChallenges);
  const create = useServerFn(createChallenge);
  const respond = useServerFn(respondToChallenge);
  const propose = useServerFn(proposeChallengeReschedule);
  const respondReschedule = useServerFn(respondToChallengeReschedule);
  const cancelScheduled = useServerFn(cancelScheduledChallenge);

  const myTeamsQ = useQuery({
    queryKey: ["my-teams"],
    queryFn: () => fetchMyTeams(),
    enabled: !!userId,
  });
  const teamsQ = useQuery({
    queryKey: ["teams"],
    queryFn: () => fetchTeams(),
    enabled: !!userId,
  });
  const arenasQ = useQuery({
    queryKey: ["arenas"],
    queryFn: () => fetchArenas(),
    enabled: !!userId,
  });
  const pendingInviteQ = useQuery({
    queryKey: ["pending-challenge-invite", userId],
    queryFn: () => fetchPendingChallengeInvite(userId!),
    enabled: !!userId,
  });
  const myChallengesQ = useQuery({
    queryKey: ["my-challenges"],
    queryFn: () => fetchMyChallenges(),
    enabled: !!userId,
  });

  const arenas = useMemo(() => (arenasQ.data ?? []) as ArenaLite[], [arenasQ.data]);
  const allMyTeams = useMemo(() => (myTeamsQ.data ?? []) as TeamLite[], [myTeamsQ.data]);
  const allTeams = useMemo(() => (teamsQ.data ?? []) as TeamLite[], [teamsQ.data]);

  const readyTeams = useMemo(
    () =>
      allMyTeams.filter((team) => {
        const memberCount = team.members?.length ?? 0;
        return (
          isUserTeamCaptain(team, userId) &&
          team.rank_position != null &&
          isTeamComplete(team.category, memberCount)
        );
      }),
    [allMyTeams, userId],
  );

  const incompleteTeams = useMemo(
    () =>
      allMyTeams.filter(
        (team) =>
          isUserTeamCaptain(team, userId) && !readyTeams.some((ready) => ready.id === team.id),
      ),
    [allMyTeams, readyTeams, userId],
  );

  useEffect(() => {
    if (readyTeams.length === 1 && !myTeamId) {
      setMyTeamId(readyTeams[0].id);
      setStep("opponent");
    }
  }, [readyTeams, myTeamId]);

  useEffect(() => {
    if (arenas.length === 1 && !schedule.arenaId) {
      setSchedule((current) => ({ ...current, arenaId: arenas[0].id }));
    }
  }, [arenas, schedule.arenaId]);

  const myTeam = readyTeams.find((team) => team.id === myTeamId) ?? null;

  const candidates = useMemo(() => {
    if (!myTeam || myTeam.rank_position == null) return [];
    const required = requiredTeamMemberCount(myTeam.category);

    return allTeams
      .filter((team) => {
        if (team.id === myTeam.id) return false;
        if (team.category !== myTeam.category || team.gender !== myTeam.gender) return false;
        if (team.rank_position == null) return false;
        if ((team.members?.length ?? 0) !== required) return false;
        return canChallengeTeam(myTeam.rank_position!, team.rank_position);
      })
      .sort((a, b) => (a.rank_position ?? 9999) - (b.rank_position ?? 9999));
  }, [allTeams, myTeam]);

  const opponent = candidates.find((team) => team.id === opponentId) ?? null;

  const allChallenges = useMemo(() => {
    const data = myChallengesQ.data;
    if (!data) return [] as ChallengeLite[];
    return [...(data.sent as ChallengeLite[]), ...(data.received as ChallengeLite[])];
  }, [myChallengesQ.data]);

  const counterToAnswer =
    allChallenges.find(
      (challenge) =>
        challenge.status === "reschedule_requested" &&
        !!challenge.reschedule_proposed_by &&
        challenge.reschedule_proposed_by !== userId,
    ) ?? null;

  const scheduledChallenges = allChallenges.filter((challenge) => challenge.status === "scheduled");

  const refreshChallenges = () => {
    qc.invalidateQueries({ queryKey: ["pending-challenge-invite"] });
    qc.invalidateQueries({ queryKey: ["my-challenges"] });
  };

  const clearMainSchedule = () => {
    setSchedule({
      arenaId: arenas.length === 1 ? arenas[0].id : "",
      date: "",
      time: "",
      courtId: "",
    });
  };

  const openCounter = (challengeId: string) => {
    setCounterChallengeId(challengeId);
    setCounterReason("");
    setCounterSchedule({
      arenaId: arenas.length === 1 ? arenas[0].id : "",
      date: "",
      time: "",
      courtId: "",
    });
  };

  const respondM = useMutation({
    mutationFn: (action: "accept" | "decline") =>
      respond({
        data: {
          challengeId: pendingInviteQ.data!.id,
          action,
        },
      }),
    onSuccess: (_, action) => {
      toast.success(action === "accept" ? "Jogo confirmado!" : "Desafio recusado.");
      refreshChallenges();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createM = useMutation({
    mutationFn: () =>
      create({
        data: {
          challengerTeamId: myTeamId,
          challengedTeamId: opponentId,
          date: schedule.date,
          time: schedule.time,
          courtId: schedule.courtId,
          arenaId: schedule.arenaId,
        },
      }),
    onSuccess: () => {
      toast.success("Convite enviado para o outro capitão.");
      refreshChallenges();
      setStep("sent");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const counterM = useMutation({
    mutationFn: () =>
      propose({
        data: {
          challengeId: counterChallengeId,
          date: counterSchedule.date,
          time: counterSchedule.time,
          arenaId: counterSchedule.arenaId,
          courtId: counterSchedule.courtId,
          reason: counterReason,
        },
      }),
    onSuccess: () => {
      toast.success("Novo horário enviado para o outro capitão.");
      setCounterChallengeId("");
      setCounterReason("");
      refreshChallenges();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const respondCounterM = useMutation({
    mutationFn: (action: "accept" | "decline") =>
      respondReschedule({
        data: {
          challengeId: counterToAnswer!.id,
          action,
        },
      }),
    onSuccess: (_, action) => {
      toast.success(action === "accept" ? "Novo horário confirmado!" : "Negociação encerrada.");
      refreshChallenges();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cancelM = useMutation({
    mutationFn: () =>
      cancelScheduled({
        data: {
          challengeId: cancelChallengeId,
          reason: cancelReason,
          note: cancelNote,
        },
      }),
    onSuccess: (result) => {
      const penalty = Number(
        (result as { cancellation_penalty?: number } | null)?.cancellation_penalty ?? 0,
      );
      toast.success(
        penalty < 0
          ? `Jogo cancelado. Penalidade aplicada: ${penalty} pontos.`
          : "Jogo cancelado sem penalidade.",
      );
      setCancelChallengeId("");
      setCancelNote("");
      refreshChallenges();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const startOver = () => {
    setStep(readyTeams.length === 1 ? "opponent" : "team");
    setOpponentId("");
    clearMainSchedule();
  };

  if (!userId) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted-foreground">
          Carregando…
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-4 px-3 py-5 sm:px-4 sm:py-8">
        <header>
          <div className="flex items-center gap-2">
            <Trophy className="size-6 text-primary" />
            <h1 className="text-2xl font-bold sm:text-3xl">Desafiar um time</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha o adversário, proponha o jogo e deixe os capitães acertarem o horário.
          </p>
        </header>

        {pendingInviteQ.data ? (
          <PendingInviteCard
            invite={pendingInviteQ.data}
            onAccept={() => respondM.mutate("accept")}
            onCounter={() => openCounter(pendingInviteQ.data!.id)}
            onDecline={() => respondM.mutate("decline")}
            pending={respondM.isPending}
          />
        ) : null}

        {counterToAnswer ? (
          <Card className="border-primary/30 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              Novo horário proposto
            </div>
            <div className="mt-1 font-semibold">
              {counterToAnswer.challenger.name} x {counterToAnswer.challenged.name}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {counterToAnswer.proposed_date ? formatDate(counterToAnswer.proposed_date) : ""}
              {counterToAnswer.proposed_time
                ? ` · ${counterToAnswer.proposed_time.slice(0, 5)}`
                : ""}
              {counterToAnswer.proposed_arena ? ` · ${counterToAnswer.proposed_arena.name}` : ""}
              {counterToAnswer.proposed_court ? ` · ${counterToAnswer.proposed_court.name}` : ""}
            </div>
            {counterToAnswer.reschedule_reason ? (
              <div className="mt-2 rounded-lg bg-secondary/50 p-3 text-sm">
                Motivo: {counterToAnswer.reschedule_reason}
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => respondCounterM.mutate("accept")}
                disabled={respondCounterM.isPending}
              >
                <Check className="mr-1.5 size-4" />
                Aceitar horário
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openCounter(counterToAnswer.id)}
                disabled={respondCounterM.isPending}
              >
                <RefreshCw className="mr-1.5 size-4" />
                Propor outro
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => respondCounterM.mutate("decline")}
                disabled={respondCounterM.isPending}
              >
                <X className="mr-1.5 size-4" />
                Encerrar negociação
              </Button>
            </div>
          </Card>
        ) : null}

        {counterChallengeId ? (
          <Card className="space-y-4 p-4">
            <div>
              <h2 className="font-semibold">Propor outro horário</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cada time pode fazer até 3 propostas. Escolha uma opção de agenda diferente.
              </p>
            </div>
            <SchedulePicker
              queryKey="counter-schedule"
              arenas={arenas}
              value={counterSchedule}
              onChange={setCounterSchedule}
            />
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="counter-reason">
                Motivo
              </label>
              <input
                id="counter-reason"
                value={counterReason}
                onChange={(event) => setCounterReason(event.target.value)}
                placeholder="Ex.: nesse horário meu parceiro trabalha"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                maxLength={500}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => counterM.mutate()}
                disabled={
                  counterM.isPending ||
                  !counterSchedule.arenaId ||
                  !counterSchedule.date ||
                  !counterSchedule.time ||
                  !counterSchedule.courtId ||
                  counterReason.trim().length < 3
                }
              >
                Enviar novo horário
              </Button>
              <Button variant="outline" onClick={() => setCounterChallengeId("")}>
                Voltar
              </Button>
            </div>
          </Card>
        ) : null}

        {scheduledChallenges.length > 0 ? (
          <Card className="space-y-3 p-4">
            <div>
              <h2 className="font-semibold">Jogos confirmados</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Se precisar cancelar, informe o motivo. O sistema calcula a penalidade pela
                antecedência.
              </p>
            </div>
            {scheduledChallenges.map((challenge) => (
              <div key={challenge.id} className="rounded-xl border p-3">
                <div className="font-medium">
                  {challenge.challenger.name} x {challenge.challenged.name}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {challenge.scheduled_date ? formatDate(challenge.scheduled_date) : ""}
                  {challenge.scheduled_time ? ` · ${challenge.scheduled_time.slice(0, 5)}` : ""}
                  {challenge.arena ? ` · ${challenge.arena.name}` : ""}
                  {challenge.court ? ` · ${challenge.court.name}` : ""}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setCancelChallengeId(challenge.id)}
                >
                  Cancelar jogo
                </Button>
              </div>
            ))}
          </Card>
        ) : null}

        {cancelChallengeId ? (
          <Card className="space-y-4 p-4">
            <div>
              <h2 className="font-semibold">Cancelar jogo confirmado</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Chuva ou arena indisponível não gera punição. Outros motivos: mais de 24h = 0,
                entre 6h e 24h = -10, menos de 6h = -20. Depois do início, vale o fluxo de W.O.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="cancel-reason">
                Motivo
              </label>
              <select
                id="cancel-reason"
                value={cancelReason}
                onChange={(event) =>
                  setCancelReason(
                    event.target.value as
                      | "weather"
                      | "arena_unavailable"
                      | "injury"
                      | "personal"
                      | "other",
                  )
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="weather">Chuva / condição climática</option>
                <option value="arena_unavailable">Arena indisponível</option>
                <option value="injury">Lesão</option>
                <option value="personal">Problema pessoal</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="cancel-note">
                Observação
              </label>
              <input
                id="cancel-note"
                value={cancelNote}
                onChange={(event) => setCancelNote(event.target.value)}
                placeholder="Explique rapidamente o cancelamento"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                maxLength={500}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={() => cancelM.mutate()} disabled={cancelM.isPending}>
                Confirmar cancelamento
              </Button>
              <Button variant="outline" onClick={() => setCancelChallengeId("")}>
                Voltar
              </Button>
            </div>
          </Card>
        ) : null}

        <Card className="space-y-6 p-4 sm:p-6">
          <FlowHeader step={step} />

          {step === "team" ? (
            <div className="space-y-4">
              {readyTeams.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-primary/10">
                    <Users className="size-7 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">
                    {incompleteTeams.length > 0 ? "Complete seu time" : "Monte seu time"}
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Você precisa ter um time completo e no ranking para iniciar um desafio.
                  </p>
                  <Button asChild className="mt-5">
                    <Link to="/perfil">
                      {incompleteTeams.length > 0 ? "Completar meu time" : "Montar meu time"}
                    </Link>
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-xl font-semibold">Qual time vai jogar?</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Escolha seu time para ver somente adversários permitidos pelo ranking.
                    </p>
                  </div>
                  <div className="grid gap-3">
                    {readyTeams.map((team) => {
                      const selected = myTeamId === team.id;
                      return (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => {
                            setMyTeamId(team.id);
                            setOpponentId("");
                            clearMainSchedule();
                          }}
                          className={cn(
                            "w-full rounded-2xl border p-4 text-left transition-colors",
                            selected ? "border-primary bg-primary/5" : "hover:border-primary/40",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <TeamAvatar team={team} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold">{team.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatTeamType(team)}
                              </div>
                            </div>
                            <Badge>#{team.rank_position}</Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={!myTeamId}
                    onClick={() => setStep("opponent")}
                  >
                    Escolher adversário
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </>
              )}
            </div>
          ) : null}

          {step === "opponent" && myTeam ? (
            <div className="space-y-4">
              {readyTeams.length > 1 ? (
                <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setStep("team")}>
                  <ArrowLeft className="mr-1 size-4" />
                  Trocar meu time
                </Button>
              ) : null}

              <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Seu time</div>
                  <div className="truncate font-semibold">{myTeam.name}</div>
                </div>
                <Badge>#{myTeam.rank_position}</Badge>
              </div>

              <div>
                <h2 className="text-xl font-semibold">Quem você quer desafiar?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pode desafiar até 5 posições acima e 2 posições abaixo.
                </p>
              </div>

              <div className="grid gap-3">
                {candidates.map((team) => {
                  const selected = opponentId === team.id;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => {
                        setOpponentId(team.id);
                        clearMainSchedule();
                      }}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition-colors",
                        selected ? "border-primary bg-primary/5" : "hover:border-primary/40",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <TeamAvatar team={team} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold">{team.name}</div>
                          <div className="text-sm text-muted-foreground">{formatTeamType(team)}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Vitória +20 pts · 2x0 +25 pts · derrota +5 pts
                          </div>
                        </div>
                        <Badge variant={selected ? "default" : "secondary"}>
                          #{team.rank_position}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={!opponentId}
                onClick={() => setStep("schedule")}
              >
                Marcar jogo
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          ) : null}

          {step === "schedule" && myTeam && opponent ? (
            <div className="space-y-5">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2"
                onClick={() => setStep("opponent")}
              >
                <ArrowLeft className="mr-1 size-4" />
                Trocar adversário
              </Button>

              <div className="flex items-center justify-between gap-3 rounded-xl border p-4">
                <div className="min-w-0">
                  <div className="truncate font-semibold">
                    {myTeam.name} <span className="text-muted-foreground">x</span> {opponent.name}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    #{myTeam.rank_position} x #{opponent.rank_position}
                  </div>
                </div>
                <Volleyball className="size-5 shrink-0 text-primary" />
              </div>

              <div>
                <h2 className="text-xl font-semibold">Proponha o jogo</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Escolha arena, data, horário e quadra. O outro capitão pode aceitar ou propor outro
                  horário.
                </p>
              </div>

              <SchedulePicker
                queryKey="new-challenge-schedule"
                arenas={arenas}
                value={schedule}
                onChange={setSchedule}
              />

              <Button
                className="w-full"
                size="lg"
                disabled={
                  !schedule.arenaId ||
                  !schedule.date ||
                  !schedule.time ||
                  !schedule.courtId ||
                  createM.isPending
                }
                onClick={() => createM.mutate()}
              >
                {createM.isPending ? "Enviando convite…" : "Enviar convite para o outro time"}
              </Button>
            </div>
          ) : null}

          {step === "sent" ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-green-500/10">
                <Check className="size-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold">Convite enviado</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                O outro capitão pode aceitar ou propor outro horário. Quando os dois concordarem, o
                jogo fica confirmado.
              </p>
              <Button variant="outline" className="mt-5" onClick={startOver}>
                Fazer outro desafio
              </Button>
            </div>
          ) : null}
        </Card>
      </div>
    </AppLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import {
  createChallenge,
  findCommonSundays,
  getAvailableChallengeCourts,
  getMyTeams,
  listArenas,
  listTeams,
  respondToChallenge,
} from "@/lib/ranking.functions";
import {
  fetchPendingChallengeInvite,
  type PendingChallengeInvite,
} from "@/lib/challenge-invite.queries";
import { canChallengeTeam, isTeamComplete, isUserTeamCaptain } from "@/lib/challenge-rules";
import { requiredTeamMemberCount } from "@/lib/team-format";
import { hourlyStartsWithinWindow } from "@/lib/challenge-scheduling";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  Trophy,
  Users,
  Volleyball,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

type CommonSunday = {
  sunday_date: string;
  overlap_start: string;
  overlap_end: string;
  challenger_arena_id: string | null;
  challenged_arena_id: string | null;
};

type CourtSlot = {
  court_id: string;
  court_number: number;
  court_name: string;
};

type FlowStep = "team" | "opponent" | "schedule" | "sent";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${date}T12:00:00`));
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
              className={cn(
                "h-1.5 rounded-full mb-2",
                done || active ? "bg-primary" : "bg-muted",
              )}
            />
            <div
              className={cn(
                "text-xs sm:text-sm font-medium truncate",
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

function PendingInviteCard({
  invite,
  onRespond,
  pending,
}: {
  invite: PendingChallengeInvite;
  onRespond: (action: "accept" | "decline") => void;
  pending: boolean;
}) {
  return (
    <Card className="p-4 border-primary/30 bg-primary/5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="size-10 rounded-full bg-primary/10 grid place-items-center shrink-0">
          <Volleyball className="size-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-primary font-semibold">
            Você recebeu um desafio
          </div>
          <div className="font-semibold mt-0.5">
            {invite.challenger.name} x {invite.challenged.name}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {invite.scheduled_date ? formatDate(invite.scheduled_date) : ""}
            {invite.scheduled_time ? ` · ${invite.scheduled_time.slice(0, 5)}` : ""}
            {invite.court ? ` · ${invite.court.name}` : ""}
          </div>
        </div>
        {invite.isCaptain ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onRespond("accept")} disabled={pending}>
              <Check className="size-4 mr-1.5" />
              Aceitar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRespond("decline")}
              disabled={pending}
            >
              <X className="size-4 mr-1.5" />
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
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [courtId, setCourtId] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const fetchMyTeams = useServerFn(getMyTeams);
  const fetchTeams = useServerFn(listTeams);
  const fetchCommonSundays = useServerFn(findCommonSundays);
  const fetchCourts = useServerFn(getAvailableChallengeCourts);
  const fetchArenas = useServerFn(listArenas);
  const create = useServerFn(createChallenge);
  const respond = useServerFn(respondToChallenge);

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

  const allMyTeams = useMemo(() => (myTeamsQ.data ?? []) as TeamLite[], [myTeamsQ.data]);
  const allTeams = useMemo(() => (teamsQ.data ?? []) as TeamLite[], [teamsQ.data]);

  const readyTeams = useMemo(() => {
    return allMyTeams.filter((team) => {
      const memberCount = team.members?.length ?? 0;
      return (
        isUserTeamCaptain(team, userId) &&
        team.rank_position != null &&
        isTeamComplete(team.category, memberCount)
      );
    });
  }, [allMyTeams, userId]);

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

  const commonSundaysQ = useQuery({
    queryKey: ["common-sundays", myTeamId, opponentId],
    queryFn: () =>
      fetchCommonSundays({
        data: { challengerTeamId: myTeamId, challengedTeamId: opponentId },
      }),
    enabled: !!myTeamId && !!opponentId,
  });

  const commonSundays = (commonSundaysQ.data ?? []) as CommonSunday[];
  const overlap = commonSundays.find((item) => item.sunday_date === date);
  const arenaId = overlap?.challenger_arena_id ?? "";
  const arenaName = (arenasQ.data ?? []).find((arena) => arena.id === arenaId)?.name ?? "Arena";

  const availableTimes = useMemo(() => {
    if (!overlap) return [];
    return hourlyStartsWithinWindow(overlap.overlap_start, overlap.overlap_end);
  }, [overlap]);

  const courtsQ = useQuery({
    queryKey: ["challenge-courts", date, time, arenaId],
    queryFn: () => fetchCourts({ data: { date, time, arenaId } }),
    enabled: !!date && !!time && !!arenaId,
  });

  const availableCourts = ((courtsQ.data ?? []) as CourtSlot[]).sort(
    (a, b) => a.court_number - b.court_number,
  );

  const respondM = useMutation({
    mutationFn: (action: "accept" | "decline") =>
      respond({
        data: {
          challengeId: pendingInviteQ.data!.id,
          action,
        },
      }),
    onSuccess: (_, action) => {
      toast.success(
        action === "accept" ? "Desafio confirmado. O jogo está marcado!" : "Desafio recusado.",
      );
      qc.invalidateQueries({ queryKey: ["pending-challenge-invite"] });
      qc.invalidateQueries({ queryKey: ["my-challenges"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createM = useMutation({
    mutationFn: () =>
      create({
        data: {
          challengerTeamId: myTeamId,
          challengedTeamId: opponentId,
          date,
          time,
          courtId,
          arenaId,
        },
      }),
    onSuccess: () => {
      toast.success("Convite enviado para o capitão do outro time.");
      qc.invalidateQueries({ queryKey: ["my-challenges"] });
      setStep("sent");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const clearSchedule = () => {
    setDate("");
    setTime("");
    setCourtId("");
  };

  const startOver = () => {
    setStep(readyTeams.length === 1 ? "opponent" : "team");
    setOpponentId("");
    clearSchedule();
  };

  if (!userId) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-10 text-sm text-muted-foreground">
          Carregando…
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-5 sm:py-8 space-y-4">
        <header>
          <div className="flex items-center gap-2">
            <Trophy className="size-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold">Desafiar um time</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha o adversário, marque o jogo e envie o convite.
          </p>
        </header>

        {pendingInviteQ.data ? (
          <PendingInviteCard
            invite={pendingInviteQ.data}
            onRespond={(action) => respondM.mutate(action)}
            pending={respondM.isPending}
          />
        ) : null}

        <Card className="p-4 sm:p-6 space-y-6">
          <FlowHeader step={step} />

          {step === "team" ? (
            <div className="space-y-4">
              {readyTeams.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="size-14 rounded-full bg-primary/10 grid place-items-center mx-auto mb-3">
                    <Users className="size-7 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">
                    {incompleteTeams.length > 0 ? "Complete seu time" : "Monte seu time"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                    {incompleteTeams.length > 0
                      ? "Seu time ainda precisa ficar completo e entrar no ranking antes de desafiar outro time."
                      : "Você precisa ter um time completo no ranking para começar um desafio."}
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
                    <p className="text-sm text-muted-foreground mt-1">
                      Escolha seu time para ver somente quem ele pode desafiar.
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
                            clearSchedule();
                          }}
                          className={cn(
                            "w-full rounded-2xl border p-4 text-left transition-colors",
                            selected ? "border-primary bg-primary/5" : "hover:border-primary/40",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <TeamAvatar team={team} />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold truncate">{team.name}</div>
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
                    <ArrowRight className="size-4 ml-2" />
                  </Button>
                </>
              )}
            </div>
          ) : null}

          {step === "opponent" && myTeam ? (
            <div className="space-y-4">
              {readyTeams.length > 1 ? (
                <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setStep("team")}>
                  <ArrowLeft className="size-4 mr-1" />
                  Trocar meu time
                </Button>
              ) : null}

              <div className="rounded-xl bg-secondary/50 px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Seu time</div>
                  <div className="font-semibold truncate">{myTeam.name}</div>
                </div>
                <Badge>#{myTeam.rank_position}</Badge>
              </div>

              <div>
                <h2 className="text-xl font-semibold">Quem você quer desafiar?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Aqui aparecem somente os times que você pode desafiar pelas regras do ranking.
                </p>
              </div>

              {candidates.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhum time disponível para desafio neste momento.
                </div>
              ) : (
                <div className="grid gap-3">
                  {candidates.map((team) => {
                    const selected = opponentId === team.id;
                    return (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => {
                          setOpponentId(team.id);
                          clearSchedule();
                        }}
                        className={cn(
                          "w-full rounded-2xl border p-4 text-left transition-colors",
                          selected ? "border-primary bg-primary/5" : "hover:border-primary/40",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <TeamAvatar team={team} />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{team.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatTeamType(team)}
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
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={!opponentId}
                onClick={() => setStep("schedule")}
              >
                Marcar jogo
                <ArrowRight className="size-4 ml-2" />
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
                <ArrowLeft className="size-4 mr-1" />
                Trocar adversário
              </Button>

              <div className="rounded-xl border p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {myTeam.name} <span className="text-muted-foreground">x</span> {opponent.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    #{myTeam.rank_position} x #{opponent.rank_position}
                  </div>
                </div>
                <Volleyball className="size-5 text-primary shrink-0" />
              </div>

              <div>
                <h2 className="text-xl font-semibold">Quando vai ser o jogo?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha uma data em que os dois times estejam disponíveis.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 font-medium mb-2">
                  <CalendarDays className="size-4 text-primary" />
                  Data
                </div>
                {commonSundaysQ.isLoading ? (
                  <p className="text-sm text-muted-foreground">Buscando datas disponíveis…</p>
                ) : commonSundays.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    Não existe uma data em comum entre os dois times ainda.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {commonSundays.map((item) => (
                      <Button
                        key={item.sunday_date}
                        type="button"
                        variant={date === item.sunday_date ? "default" : "outline"}
                        onClick={() => {
                          setDate(item.sunday_date);
                          setTime("");
                          setCourtId("");
                        }}
                      >
                        {formatDate(item.sunday_date)}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {date ? (
                <div>
                  <div className="flex items-center gap-2 font-medium mb-2">
                    <Clock className="size-4 text-primary" />
                    Horário
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableTimes.map((slot) => (
                      <Button
                        key={slot}
                        type="button"
                        variant={time === slot ? "default" : "outline"}
                        onClick={() => {
                          setTime(slot);
                          setCourtId("");
                        }}
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              {date && time ? (
                <div>
                  <div className="flex items-center gap-2 font-medium mb-2">
                    <MapPin className="size-4 text-primary" />
                    Quadra
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">{arenaName}</div>
                  {courtsQ.isLoading ? (
                    <p className="text-sm text-muted-foreground">Buscando quadras livres…</p>
                  ) : availableCourts.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                      Nenhuma quadra livre neste horário.
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-2">
                      {availableCourts.map((court) => (
                        <Button
                          key={court.court_id}
                          type="button"
                          variant={courtId === court.court_id ? "default" : "outline"}
                          className="justify-start"
                          onClick={() => setCourtId(court.court_id)}
                        >
                          <Volleyball className="size-4 mr-2" />
                          {court.court_name}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              <Button
                className="w-full"
                size="lg"
                disabled={!date || !time || !courtId || createM.isPending}
                onClick={() => createM.mutate()}
              >
                {createM.isPending ? "Enviando convite…" : "Enviar convite para o outro time"}
              </Button>
            </div>
          ) : null}

          {step === "sent" ? (
            <div className="py-8 text-center">
              <div className="size-16 mx-auto rounded-full bg-green-500/10 grid place-items-center mb-4">
                <Check className="size-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold">Convite enviado</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Agora é só aguardar o capitão do outro time confirmar. Quando ele aceitar, o jogo
                fica marcado.
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

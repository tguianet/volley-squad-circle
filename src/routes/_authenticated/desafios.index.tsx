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
import {
  canChallengeTeam,
  getChallengeEligibilityBadge,
  isTeamComplete,
  isUserTeamCaptain,
} from "@/lib/challenge-rules";
import { requiredTeamMemberCount } from "@/lib/team-format";
import { hourlyStartsWithinWindow } from "@/lib/challenge-scheduling";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  Shield,
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

type WizardStep = 1 | 2 | 3 | 4 | 5;

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

function StepHeader({ step }: { step: WizardStep }) {
  const labels = ["Meu time", "Adversário", "Agendamento", "Confirmar", "Enviado"];
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {labels.map((label, index) => {
        const current = (index + 1) as WizardStep;
        const active = current === step;
        const done = current < step;
        return (
          <div key={label} className="flex items-center gap-2 shrink-0">
            <div
              className={cn(
                "size-8 rounded-full grid place-items-center text-xs font-bold border",
                done && "bg-primary text-primary-foreground border-primary",
                active && "border-primary text-primary bg-primary/10",
                !done && !active && "border-border text-muted-foreground",
              )}
            >
              {done ? <Check className="size-4" /> : current}
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {index < labels.length - 1 ? (
              <ArrowRight className="size-4 text-muted-foreground/40" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
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
    <Card className="p-5 border-primary/30 bg-primary/5">
      <div className="flex items-start gap-3">
        <div className="size-11 rounded-full bg-primary/10 grid place-items-center shrink-0">
          <Volleyball className="size-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-primary font-semibold">
            Convite recebido
          </p>
          <h2 className="font-semibold text-lg mt-1">
            {invite.challenger.name} desafiou {invite.challenged.name}
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
            {invite.scheduled_date ? (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-4" />
                {formatDate(invite.scheduled_date)}
              </span>
            ) : null}
            {invite.scheduled_time ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-4" />
                {invite.scheduled_time.slice(0, 5)}
              </span>
            ) : null}
            {invite.court ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" />
                {invite.court.name}
              </span>
            ) : null}
          </div>
          {invite.isCaptain ? (
            <div className="flex gap-2 mt-4">
              <Button onClick={() => onRespond("accept")} disabled={pending}>
                <Check className="size-4 mr-2" />
                Aceitar
              </Button>
              <Button variant="outline" onClick={() => onRespond("decline")} disabled={pending}>
                <X className="size-4 mr-2" />
                Recusar
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-3">
              Somente o capitão do seu time pode responder este convite.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function DesafiosPage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState<WizardStep>(1);
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

  const allMyTeams = (myTeamsQ.data ?? []) as TeamLite[];
  const allTeams = (teamsQ.data ?? []) as TeamLite[];

  const selectableTeams = useMemo(() => {
    return allMyTeams.filter((team) => {
      const memberCount = team.members?.length ?? 0;
      return (
        isUserTeamCaptain(team, userId) &&
        team.rank_position != null &&
        isTeamComplete(team.category, memberCount)
      );
    });
  }, [allMyTeams, userId]);

  const incompleteTeams = useMemo(() => {
    return allMyTeams.filter(
      (team) =>
        isUserTeamCaptain(team, userId) && !selectableTeams.some((ready) => ready.id === team.id),
    );
  }, [allMyTeams, selectableTeams, userId]);

  useEffect(() => {
    if (selectableTeams.length === 1 && !myTeamId) setMyTeamId(selectableTeams[0].id);
  }, [selectableTeams, myTeamId]);

  const myTeam = selectableTeams.find((team) => team.id === myTeamId) ?? null;

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
  const selectedCourt = availableCourts.find((court) => court.court_id === courtId) ?? null;

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
        action === "accept" ? "Desafio confirmado! Jogo marcado." : "Desafio recusado.",
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
      setStep(5);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetAfterTeam = () => {
    setOpponentId("");
    setDate("");
    setTime("");
    setCourtId("");
  };

  if (!userId) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-10 text-sm text-muted-foreground">
          Carregando…
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5 sm:py-8 space-y-5">
        <header>
          <div className="flex items-center gap-2 text-primary">
            <Trophy className="size-6" />
            <h1 className="text-2xl sm:text-3xl font-bold">Desafios</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Monte seu time, escolha um adversário do ranking e marque o jogo.
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
          <StepHeader step={step} />

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">1. Escolha seu time</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Para desafiar alguém, seu time precisa estar completo e no ranking.
                </p>
              </div>

              {selectableTeams.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-center">
                  <Users className="size-10 mx-auto text-primary mb-3" />
                  <h3 className="font-semibold text-lg">
                    {incompleteTeams.length > 0
                      ? "Complete seu time primeiro"
                      : "Monte seu time primeiro"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    {incompleteTeams.length > 0
                      ? "Seu time ainda não está completo para entrar nos desafios."
                      : "Você ainda não tem um time pronto para disputar o ranking."}
                  </p>
                  <Button asChild>
                    <Link to="/perfil">Montar meu time</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-3">
                    {selectableTeams.map((team) => {
                      const selected = myTeamId === team.id;
                      return (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => {
                            setMyTeamId(team.id);
                            resetAfterTeam();
                          }}
                          className={cn(
                            "w-full text-left rounded-2xl border p-4 transition-colors",
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
                  <div className="flex justify-end">
                    <Button disabled={!myTeamId} onClick={() => setStep(2)}>
                      Ver quem posso desafiar
                      <ArrowRight className="size-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {step === 2 && myTeam ? (
            <div className="space-y-4">
              <div>
                <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => setStep(1)}>
                  <ArrowLeft className="size-4 mr-1" />
                  Voltar
                </Button>
                <h2 className="text-xl font-semibold">2. Quem você pode desafiar</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Você está em <strong>#{myTeam.rank_position}</strong>. Abaixo aparecem somente os
                  times permitidos pelas regras do ranking.
                </p>
              </div>

              {candidates.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhum adversário disponível para este time no momento.
                </div>
              ) : (
                <div className="grid gap-3">
                  {candidates.map((team) => {
                    const selected = opponentId === team.id;
                    const badge = getChallengeEligibilityBadge(
                      myTeam.rank_position!,
                      team.rank_position!,
                    );
                    return (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => {
                          setOpponentId(team.id);
                          setDate("");
                          setTime("");
                          setCourtId("");
                        }}
                        className={cn(
                          "w-full text-left rounded-2xl border p-4 transition-colors",
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
                          <div className="text-right">
                            <Badge>#{team.rank_position}</Badge>
                            <div className="text-[11px] text-muted-foreground mt-1">
                              {badge === "above"
                                ? "subir no ranking"
                                : badge === "top5"
                                  ? "TOP 5"
                                  : "defender posição"}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end">
                <Button disabled={!opponentId} onClick={() => setStep(3)}>
                  Marcar o jogo
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              </div>
            </div>
          ) : null}

          {step === 3 && myTeam && opponent ? (
            <div className="space-y-5">
              <div>
                <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => setStep(2)}>
                  <ArrowLeft className="size-4 mr-1" />
                  Voltar
                </Button>
                <h2 className="text-xl font-semibold">3. Marque data, horário e quadra</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Mostramos somente horários em que os dois times informaram disponibilidade.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 font-medium mb-2">
                  <CalendarDays className="size-4 text-primary" />
                  Data
                </div>
                {commonSundaysQ.isLoading ? (
                  <p className="text-sm text-muted-foreground">Buscando datas em comum…</p>
                ) : commonSundays.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    Os dois times ainda não possuem uma data disponível em comum.
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
                  <p className="text-xs text-muted-foreground mb-2">{arenaName}</p>
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

              <div className="flex justify-end">
                <Button disabled={!date || !time || !courtId} onClick={() => setStep(4)}>
                  Revisar convite
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              </div>
            </div>
          ) : null}

          {step === 4 && myTeam && opponent && selectedCourt ? (
            <div className="space-y-5">
              <div>
                <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => setStep(3)}>
                  <ArrowLeft className="size-4 mr-1" />
                  Voltar
                </Button>
                <h2 className="text-xl font-semibold">4. Confirme e envie</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  O outro capitão receberá este convite para aceitar ou recusar.
                </p>
              </div>

              <div className="rounded-2xl border p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Seu time</div>
                    <div className="font-semibold">{myTeam.name}</div>
                  </div>
                  <Badge>#{myTeam.rank_position}</Badge>
                </div>
                <div className="flex items-center justify-center text-muted-foreground text-sm">
                  x
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Adversário</div>
                    <div className="font-semibold">{opponent.name}</div>
                  </div>
                  <Badge>#{opponent.rank_position}</Badge>
                </div>
                <div className="border-t pt-4 grid sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Data</div>
                    <div className="font-medium">{formatDate(date)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Horário</div>
                    <div className="font-medium">{time}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Quadra</div>
                    <div className="font-medium">{selectedCourt.court_name}</div>
                  </div>
                </div>
              </div>

              <Button
                className="w-full sm:w-auto"
                size="lg"
                onClick={() => createM.mutate()}
                disabled={createM.isPending}
              >
                <Shield className="size-4 mr-2" />
                {createM.isPending ? "Enviando convite…" : "Enviar desafio"}
              </Button>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="py-6 text-center">
              <div className="size-16 mx-auto rounded-full bg-green-500/10 grid place-items-center mb-4">
                <Check className="size-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold">Convite enviado!</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Agora o capitão do outro time precisa confirmar. Quando ele aceitar, o jogo fica
                marcado.
              </p>
              <div className="flex justify-center gap-2 mt-5">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                    setOpponentId("");
                    setDate("");
                    setTime("");
                    setCourtId("");
                  }}
                >
                  Criar outro desafio
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </AppLayout>
  );
}

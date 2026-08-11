import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  confirmScore,
  disputeScore,
  listMyChallenges,
  registerScore,
  requestAdminScoreReview,
  respondToChallenge,
} from "@/lib/ranking.functions";
import { getCurrentFortnightInfo } from "@/lib/challenge-fortnight";
import { useCurrentUser } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  Clock,
  History,
  Inbox,
  Loader2,
  MapPin,
  Send,
  Swords,
  X,
  Info,
  MessageCircle,
} from "lucide-react";

type ChallengeRow = {
  id: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  reschedule_reason: string | null;
  created_at: string;
  score_challenger: number | null;
  score_challenged: number | null;
  score_registered_by: string | null;
  score_admin_review_requested_by: string | null;
  score_admin_review_requested_at: string | null;
  challenger: { id: string; name: string; rank_position: number | null } | null;
  challenged: { id: string; name: string; rank_position: number | null } | null;
  arena: { id: string; name: string } | null;
  court: { id: string; number: number; name: string } | null;
};

type SubTab = "aceitar" | "enviados" | "historico";

const ACTIVE_INCOMING = new Set([
  "pending",
  "scheduled",
  "reschedule_requested",
  "awaiting_schedule",
  "awaiting_confirmation",
]);
const ACTIVE_OUTGOING = new Set([
  "pending",
  "scheduled",
  "reschedule_requested",
  "awaiting_schedule",
  "awaiting_confirmation",
]);
const HISTORY_STATUSES = new Set(["completed", "declined", "wo"]);

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando resposta",
  scheduled: "Agendado",
  reschedule_requested: "Reagendamento solicitado",
  declined: "Recusado",
  completed: "Finalizado",
  wo: "W.O.",
  awaiting_schedule: "Aguardando horário",
  awaiting_confirmation: "Aguardando confirmação",
};

function formatChallengeDate(date: string | null, time: string | null) {
  if (!date) return "Data a definir";
  const d = new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  return time ? `${d} · ${time.slice(0, 5)}` : d;
}

function ChallengeCard({
  row,
  direction,
  onAccept,
  onDecline,
  onRegisterScore,
  onConfirmScore,
  onRejectScore,
  onRequestAdminReview,
  currentUserId,
  busy,
}: {
  row: ChallengeRow;
  direction: "incoming" | "outgoing" | "history";
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onRegisterScore?: (id: string, scoreChallenger: number, scoreChallenged: number) => void;
  onConfirmScore?: (id: string) => void;
  onRejectScore?: (id: string) => void;
  onRequestAdminReview?: (id: string) => void;
  currentUserId?: string;
  busy?: boolean;
}) {
  const [scoreChallenger, setScoreChallenger] = useState("");
  const [scoreChallenged, setScoreChallenged] = useState("");
  const myTeam = direction === "outgoing" ? row.challenger : row.challenged;
  const opponent = direction === "outgoing" ? row.challenged : row.challenger;
  const showActions = direction === "incoming" && row.status === "pending" && onAccept && onDecline;
  const canRegisterScore = row.status === "scheduled" && onRegisterScore;
  const isScoreAuthor = row.score_registered_by === currentUserId;
  const canReviewScore =
    row.status === "awaiting_confirmation" &&
    !!currentUserId &&
    !isScoreAuthor &&
    onConfirmScore &&
    onRejectScore;
  const scoreIsValid =
    scoreChallenger !== "" &&
    scoreChallenged !== "" &&
    Number(scoreChallenger) >= 0 &&
    Number(scoreChallenged) >= 0 &&
    Number(scoreChallenger) !== Number(scoreChallenged);

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{myTeam?.name ?? "Meu time"}</span>
            <span className="text-muted-foreground text-xs">vs</span>
            <span className="font-semibold text-sm text-primary">{opponent?.name ?? "—"}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            #{myTeam?.rank_position ?? "—"} vs #{opponent?.rank_position ?? "—"}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] shrink-0",
            row.status === "scheduled" && "border-primary/40 text-primary",
            row.status === "pending" && "border-accent/40 text-accent",
            row.status === "completed" && "border-emerald-500/40 text-emerald-700",
            row.status === "declined" && "border-destructive/40 text-destructive",
          )}
        >
          {STATUS_LABEL[row.status] ?? row.status}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3.5" />
          {formatChallengeDate(row.scheduled_date, row.scheduled_time)}
        </span>
        {row.court?.name ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {row.court.name}
          </span>
        ) : row.arena?.name ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {row.arena.name}
          </span>
        ) : null}
        {["completed", "awaiting_confirmation"].includes(row.status) &&
        row.score_challenger != null &&
        row.score_challenged != null ? (
          <span className="font-semibold text-foreground">
            Placar: {row.score_challenger} × {row.score_challenged}
          </span>
        ) : null}
      </div>

      {row.reschedule_reason ? (
        <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg p-2">
          Motivo: {row.reschedule_reason}
        </p>
      ) : null}

      {showActions ? (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 gradient-beach text-white border-0"
            disabled={busy}
            onClick={() => onAccept(row.id)}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4 mr-1" />}
            Aceitar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={() => onDecline(row.id)}
          >
            <X className="size-4 mr-1" />
            Recusar
          </Button>
        </div>
      ) : null}

      {canRegisterScore ? (
        <div className="space-y-3 border-t border-border/60 pt-3">
          <p className="text-xs font-semibold">Registrar placar da partida</p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <label className="text-[11px] text-muted-foreground">
              {row.challenger?.name ?? "Desafiante"}
              <Input
                className="mt-1 text-center"
                type="number"
                min={0}
                inputMode="numeric"
                value={scoreChallenger}
                onChange={(event) => setScoreChallenger(event.target.value)}
              />
            </label>
            <span className="pb-2 text-muted-foreground">×</span>
            <label className="text-[11px] text-muted-foreground">
              {row.challenged?.name ?? "Desafiado"}
              <Input
                className="mt-1 text-center"
                type="number"
                min={0}
                inputMode="numeric"
                value={scoreChallenged}
                onChange={(event) => setScoreChallenged(event.target.value)}
              />
            </label>
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={busy || !scoreIsValid}
            onClick={() =>
              onRegisterScore(row.id, Number(scoreChallenger), Number(scoreChallenged))
            }
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4 mr-1" />}
            Enviar placar para confirmação
          </Button>
          {!scoreIsValid && scoreChallenger !== "" && scoreChallenged !== "" ? (
            <p className="text-[11px] text-destructive">Informe um placar válido, sem empate.</p>
          ) : null}
        </div>
      ) : null}

      {row.status === "awaiting_confirmation" ? (
        <div className="space-y-2 border-t border-border/60 pt-3">
          {canReviewScore ? (
            <>
              <p className="text-xs text-muted-foreground">
                Confira o placar acima. Ao confirmar, a partida será finalizada e o ranking será
                atualizado.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => onConfirmScore(row.id)}
                >
                  <Check className="size-4 mr-1" /> Confirmar placar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => onRejectScore(row.id)}
                >
                  <X className="size-4 mr-1" /> Rejeitar
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Placar enviado. Aguardando a confirmação do outro capitão.
              </p>
              {isScoreAuthor && onRequestAdminReview ? (
                row.score_admin_review_requested_at ? (
                  <p className="text-xs font-medium text-amber-600">
                    ADM avisado. Aguardando a análise do placar.
                  </p>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={busy}
                    onClick={() => onRequestAdminReview(row.id)}
                  >
                    <MessageCircle className="size-4 mr-1" /> Falar com ADM
                  </Button>
                )
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SubTabButton({
  label,
  count,
  active,
  onClick,
  icon: Icon,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  icon: typeof Inbox;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-2 transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border text-muted-foreground hover:border-primary/40",
      )}
    >
      <Icon className="size-4" />
      {label}
      {count != null && count > 0 ? (
        <span
          className={cn(
            "min-w-5 h-5 px-1 rounded-full text-[10px] font-bold grid place-items-center",
            active ? "bg-white/20" : "bg-accent/15 text-accent",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function MyProfileChallengesPanel() {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [subTab, setSubTab] = useState<SubTab>("aceitar");
  const fortnight = getCurrentFortnightInfo();

  const fetchChallenges = useServerFn(listMyChallenges);
  const respond = useServerFn(respondToChallenge);
  const register = useServerFn(registerScore);
  const confirm = useServerFn(confirmScore);
  const reject = useServerFn(disputeScore);
  const requestAdminReview = useServerFn(requestAdminScoreReview);

  const challengesQ = useQuery({
    queryKey: ["my-challenges"],
    queryFn: () => fetchChallenges(),
  });

  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<"accept" | "decline" | null>(null);

  const respondM = useMutation({
    mutationFn: respond,
    onSuccess: () => {
      toast.success(lastAction === "accept" ? "Desafio aceito!" : "Desafio recusado.");
      qc.invalidateQueries({ queryKey: ["my-challenges"] });
      qc.invalidateQueries({ queryKey: ["scheduled-challenges"] });
      setRespondingId(null);
      setLastAction(null);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setRespondingId(null);
    },
  });

  const refreshChallenges = () => {
    qc.invalidateQueries({ queryKey: ["my-challenges"] });
    qc.invalidateQueries({ queryKey: ["scheduled-challenges"] });
    qc.invalidateQueries({ queryKey: ["ranking"] });
    setRespondingId(null);
  };

  const registerM = useMutation({
    mutationFn: register,
    onSuccess: () => {
      toast.success("Placar enviado para confirmação.");
      refreshChallenges();
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setRespondingId(null);
    },
  });

  const confirmM = useMutation({
    mutationFn: confirm,
    onSuccess: () => {
      toast.success("Placar confirmado e partida finalizada!");
      refreshChallenges();
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setRespondingId(null);
    },
  });

  const rejectM = useMutation({
    mutationFn: reject,
    onSuccess: () => {
      toast.success("Placar rejeitado. Um novo placar pode ser registrado.");
      refreshChallenges();
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setRespondingId(null);
    },
  });

  const requestAdminM = useMutation({
    mutationFn: requestAdminReview,
    onSuccess: () => {
      toast.success("ADM avisado. O placar será analisado.");
      refreshChallenges();
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setRespondingId(null);
    },
  });

  const challengesData = challengesQ.data as { sent?: unknown[]; received?: unknown[] } | undefined;
  const sent = useMemo(
    () => (challengesData?.sent ?? []) as ChallengeRow[],
    [challengesData?.sent],
  );
  const received = useMemo(
    () => (challengesData?.received ?? []) as ChallengeRow[],
    [challengesData?.received],
  );

  const toAccept = useMemo(() => received.filter((r) => ACTIVE_INCOMING.has(r.status)), [received]);
  const sentActive = useMemo(() => sent.filter((r) => ACTIVE_OUTGOING.has(r.status)), [sent]);
  const history = useMemo(() => {
    const all = [...sent, ...received];
    const seen = new Set<string>();
    return all
      .filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return HISTORY_STATUSES.has(r.status);
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [sent, received]);

  const handleAccept = (id: string) => {
    setRespondingId(id);
    setLastAction("accept");
    respondM.mutate({ data: { challengeId: id, action: "accept" } });
  };
  const handleDecline = (id: string) => {
    setRespondingId(id);
    setLastAction("decline");
    respondM.mutate({ data: { challengeId: id, action: "decline" } });
  };

  const handleRegisterScore = (id: string, scoreChallenger: number, scoreChallenged: number) => {
    setRespondingId(id);
    registerM.mutate({ data: { challengeId: id, scoreChallenger, scoreChallenged } });
  };
  const handleConfirmScore = (id: string) => {
    setRespondingId(id);
    confirmM.mutate({ data: { challengeId: id } });
  };
  const handleRejectScore = (id: string) => {
    setRespondingId(id);
    rejectM.mutate({ data: { challengeId: id } });
  };
  const handleRequestAdminReview = (id: string) => {
    setRespondingId(id);
    requestAdminM.mutate({ data: { challengeId: id } });
  };

  const scoreMutationPending =
    registerM.isPending || confirmM.isPending || rejectM.isPending || requestAdminM.isPending;
  const busyId = respondM.isPending || scoreMutationPending ? respondingId : null;

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5 border-primary/20 bg-primary/5 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="size-11 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
              <Swords className="size-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-primary">
                {fortnight.quinzenaLabel}
              </p>
              <h3 className="font-display font-bold text-lg">
                {fortnight.role === "challenger"
                  ? "Quinzena de desafiar"
                  : "Quinzena de ser desafiado"}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">{fortnight.description}</p>
              <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                <Clock className="size-3.5" />
                Na {fortnight.nextQuinzenaLabel} você{" "}
                {fortnight.nextRole === "challenger" ? "desafia" : "é desafiado"}.
              </p>
            </div>
          </div>
          {fortnight.canCreateChallenge ? (
            <Button asChild variant="beach" className="shrink-0 font-bold">
              <Link to="/desafios">
                <Send className="size-4 mr-2" />
                Criar desafio
              </Link>
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card rounded-lg px-3 py-2 border border-border/60">
              <Info className="size-4 text-primary shrink-0" />
              Aguarde desafios de outras equipes nesta quinzena.
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <SubTabButton
          label="Para aceitar"
          count={toAccept.length}
          active={subTab === "aceitar"}
          onClick={() => setSubTab("aceitar")}
          icon={Inbox}
        />
        <SubTabButton
          label="Enviados"
          count={sentActive.length}
          active={subTab === "enviados"}
          onClick={() => setSubTab("enviados")}
          icon={Send}
        />
        <SubTabButton
          label="Histórico"
          count={history.length}
          active={subTab === "historico"}
          onClick={() => setSubTab("historico")}
          icon={History}
        />
      </div>

      {challengesQ.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {subTab === "aceitar" &&
            (toAccept.length === 0 ? (
              <EmptyState
                title="Nenhum desafio para aceitar"
                description={
                  fortnight.role === "challenged"
                    ? "Quando outra equipe desafiar seu time, aparecerá aqui."
                    : "Nesta quinzena você desafia; desafios recebidos ficam para a próxima quinzena."
                }
              />
            ) : (
              toAccept.map((r) => (
                <ChallengeCard
                  key={r.id}
                  row={r}
                  direction="incoming"
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  onRegisterScore={handleRegisterScore}
                  onConfirmScore={handleConfirmScore}
                  onRejectScore={handleRejectScore}
                  onRequestAdminReview={handleRequestAdminReview}
                  currentUserId={user?.id}
                  busy={busyId === r.id}
                />
              ))
            ))}

          {subTab === "enviados" &&
            (sentActive.length === 0 ? (
              <EmptyState
                title="Nenhum desafio enviado ativo"
                description={
                  fortnight.canCreateChallenge
                    ? "Crie um desafio para subir no ranking."
                    : "Na quinzena de ser desafiado, novos desafios enviados ficam para a próxima quinzena."
                }
                action={
                  fortnight.canCreateChallenge ? (
                    <Button asChild variant="outline" size="sm">
                      <Link to="/desafios">Ir para criar desafio</Link>
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              sentActive.map((r) => (
                <ChallengeCard
                  key={r.id}
                  row={r}
                  direction="outgoing"
                  onRegisterScore={handleRegisterScore}
                  onConfirmScore={handleConfirmScore}
                  onRejectScore={handleRejectScore}
                  onRequestAdminReview={handleRequestAdminReview}
                  currentUserId={user?.id}
                  busy={busyId === r.id}
                />
              ))
            ))}

          {subTab === "historico" &&
            (history.length === 0 ? (
              <EmptyState
                title="Sem histórico ainda"
                description="Desafios finalizados, recusados ou W.O. aparecem aqui."
              />
            ) : (
              history.map((r) => {
                const isOutgoing = sent.some((s) => s.id === r.id);
                return (
                  <ChallengeCard
                    key={r.id}
                    row={r}
                    direction={isOutgoing ? "outgoing" : "incoming"}
                  />
                );
              })
            ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="p-10 text-center border-dashed border-border/80 shadow-card">
      <div className="mx-auto size-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
        <Swords className="size-7 text-primary/60" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}

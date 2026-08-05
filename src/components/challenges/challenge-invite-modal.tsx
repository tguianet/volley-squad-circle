import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, Clock, Loader2, MapPin, Swords, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { respondToChallenge } from "@/lib/ranking.functions";
import { formatChallengeCategory } from "@/lib/challenge-category";
import type { PendingChallengeInvite } from "@/lib/challenge-invite.queries";
import { cn } from "@/lib/utils";

type ChallengeInviteModalProps = {
  invite: PendingChallengeInvite | null;
  open: boolean;
  isCaptain: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss: () => void;
  onResponded: () => void;
};

function formatInviteDate(date: string | null, time: string | null) {
  if (!date) return "A definir";
  const d = new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  return time ? `${d} · ${time.slice(0, 5)}` : d;
}

function TeamBadge({
  name,
  rank,
  highlight,
}: {
  name: string;
  rank: number | null;
  highlight?: boolean;
}) {
  return (
    <div className="flex-1 text-center min-w-0">
      <div
        className={cn(
          "size-14 mx-auto mb-2 rounded-full border-2 grid place-items-center",
          highlight ? "bg-primary/10 border-primary/30" : "bg-secondary border-border/50",
        )}
      >
        <Swords className={cn("size-6", highlight ? "text-primary" : "text-muted-foreground")} />
      </div>
      <p className="font-bold text-sm truncate">{name}</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {rank != null ? `#${rank} no ranking` : "Sem posição"}
      </p>
    </div>
  );
}

export function ChallengeInviteModal({
  invite,
  open,
  isCaptain,
  onOpenChange,
  onDismiss,
  onResponded,
}: ChallengeInviteModalProps) {
  const respond = useServerFn(respondToChallenge);
  const lastActionRef = useRef<"accept" | "decline" | null>(null);

  const respondM = useMutation({
    mutationFn: respond,
    onSuccess: () => {
      toast.success(
        lastActionRef.current === "accept" ? "Desafio aceito com sucesso." : "Desafio recusado.",
      );
      lastActionRef.current = null;
      onResponded();
      onDismiss();
    },
    onError: (e: Error) => {
      toast.error(e.message);
      lastActionRef.current = null;
    },
  });

  if (!invite) return null;

  const categoryLabel = formatChallengeCategory(
    invite.challenged.category,
    invite.challenged.gender,
  );
  const busy = respondM.isPending;
  const canAct = isCaptain && !busy;

  function handleAccept() {
    if (!isCaptain) return;
    lastActionRef.current = "accept";
    respondM.mutate({ data: { challengeId: invite!.id, action: "accept" } });
  }

  function handleDecline() {
    if (!isCaptain) return;
    lastActionRef.current = "decline";
    respondM.mutate({ data: { challengeId: invite!.id, action: "decline" } });
  }

  function handleClose() {
    onDismiss();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0 border-primary/20">
        <div className="bg-primary px-6 py-5 text-primary-foreground text-center">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-primary-foreground font-display text-xl tracking-wide">
              Novo desafio recebido
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 text-sm">
              Seu time foi desafiado no ranking
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <TeamBadge name={invite.challenger.name} rank={invite.challenger.rank_position} />
            <div className="shrink-0 flex flex-col items-center">
              <span className="font-display text-2xl text-accent font-bold tracking-widest">
                VS
              </span>
            </div>
            <TeamBadge
              name={invite.challenged.name}
              rank={invite.challenged.rank_position}
              highlight
            />
          </div>

          <div className="rounded-xl border border-border/60 bg-secondary/40 p-4 space-y-2 text-sm">
            <Row
              icon={CalendarDays}
              label="Data"
              value={formatInviteDate(invite.scheduled_date, null)}
            />
            <Row icon={Clock} label="Horário" value={invite.scheduled_time?.slice(0, 5) ?? "—"} />
            <Row icon={MapPin} label="Quadra" value={invite.court?.name ?? "—"} />
            <Row
              icon={MapPin}
              label="Arena"
              value={
                invite.arena
                  ? invite.arena.city
                    ? `${invite.arena.name} — ${invite.arena.city}`
                    : invite.arena.name
                  : "—"
              }
            />
            <Row icon={Swords} label="Categoria" value={categoryLabel} />
            <Row
              icon={Swords}
              label="Posições"
              value={`#${invite.challenger.rank_position ?? "—"} vs #${invite.challenged.rank_position ?? "—"}`}
            />
          </div>

          <div className="flex gap-2 rounded-xl bg-amber-50 border border-amber-200/80 px-3 py-2.5 text-xs text-amber-900">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <p>Se o desafiante vencer, as posições serão trocadas. Os pontos permanecem iguais.</p>
          </div>

          {!isCaptain ? (
            <p className="text-xs text-center text-muted-foreground font-medium px-2">
              Somente o capitão pode aceitar ou recusar este desafio.
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <Button
              variant="beach"
              className="w-full rounded-xl font-bold"
              disabled={!canAct}
              onClick={handleAccept}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Aceitar desafio
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl font-bold border-destructive/30 text-destructive hover:bg-destructive/5"
              disabled={!canAct}
              onClick={handleDecline}
            >
              Recusar
            </Button>
            <Button variant="ghost" className="w-full rounded-xl font-semibold" asChild>
              <Link to="/desafios" onClick={handleClose}>
                Ver meus desafios
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-xl text-muted-foreground"
              onClick={handleClose}
            >
              <X className="size-4 mr-1" />
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        {label}
      </span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}

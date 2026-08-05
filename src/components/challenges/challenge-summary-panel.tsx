import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  Clock,
  MapPin,
  Rocket,
  Shield,
  Swords,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  myTeamName?: string;
  myTeamRank?: number | null;
  opponentName?: string;
  opponentRank?: number | null;
  date?: string;
  time?: string;
  courtName?: string;
  canSubmit: boolean;
  isPending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  className?: string;
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

export function ChallengeSummaryPanel({
  myTeamName,
  myTeamRank,
  opponentName,
  opponentRank,
  date,
  time,
  courtName,
  canSubmit,
  isPending,
  onSubmit,
  onCancel,
  className,
}: Props) {
  const hasOpponent = !!opponentName;

  return (
    <div className={cn("challenge-glass rounded-2xl overflow-hidden", className)}>
      <div className="bg-primary px-6 py-4 text-center text-primary-foreground">
        <div className="flex items-center justify-center gap-2">
          <ClipboardList className="size-5" />
          <h2 className="page-title text-lg sm:text-xl text-primary-foreground tracking-widest">
            Resumo do Desafio
          </h2>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 text-center min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">
              Meu time
            </p>
            <div className="size-14 mx-auto mb-2 rounded-full bg-primary/10 border-2 border-primary/20 grid place-items-center">
              {myTeamName ? (
                <span className="font-bold text-primary text-sm">{initials(myTeamName)}</span>
              ) : (
                <Shield className="size-6 text-primary" />
              )}
            </div>
            <p className="font-bold text-sm truncate">{myTeamName ?? "—"}</p>
            <p className="text-[11px] font-bold text-accent mt-0.5">
              Posição atual: {myTeamRank != null ? `#${myTeamRank}` : "—"}
            </p>
          </div>

          <div className="flex flex-col items-center shrink-0 px-1">
            <span className="font-display text-2xl font-bold text-accent italic">VS</span>
            <div className="h-px w-10 bg-border my-1" />
          </div>

          <div className="flex-1 text-center min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Adversário
            </p>
            <div
              className={cn(
                "size-14 mx-auto mb-2 rounded-full border-2 grid place-items-center",
                hasOpponent
                  ? "bg-accent/10 border-accent/30 text-accent"
                  : "bg-muted border-border text-muted-foreground",
              )}
            >
              {hasOpponent ? (
                <span className="font-bold text-sm">{initials(opponentName)}</span>
              ) : (
                <Swords className="size-6" />
              )}
            </div>
            <p
              className={cn(
                "font-bold text-sm truncate",
                !hasOpponent && "text-muted-foreground italic",
              )}
            >
              {opponentName ?? "A definir"}
            </p>
            <p className="text-[11px] font-bold text-accent mt-0.5">
              Posição atual: {opponentRank != null ? `#${opponentRank}` : "—"}
            </p>
          </div>
        </div>

        {hasOpponent && (
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="size-4 text-accent shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Se o desafiante vencer, as posições serão trocadas. Os pontos permanecem iguais.
            </p>
          </div>
        )}

        <div className="space-y-3 border-t border-border/50 pt-4">
          <SummaryRow
            icon={<CalendarDays className="size-4" />}
            label="Data"
            value={
              date
                ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })
                : "A definir"
            }
          />
          <SummaryRow
            icon={<Clock className="size-4" />}
            label="Horário"
            value={time || "A definir"}
          />
          <SummaryRow
            icon={<MapPin className="size-4" />}
            label="Quadra"
            value={courtName || "A definir"}
          />
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="beach"
            size="lg"
            className="w-full font-bold tracking-wide uppercase"
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            {isPending ? (
              "Enviando…"
            ) : (
              <>
                <Rocket className="size-4 mr-2" />
                Enviar Desafio
              </>
            )}
          </Button>
          <Button variant="outline" className="w-full" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
      <div className="size-10 rounded-lg bg-card flex items-center justify-center text-primary shadow-sm shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="font-bold text-sm truncate capitalize">{value}</p>
      </div>
    </div>
  );
}

import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateBR } from "@/lib/date-format";
import type { RankingDetailsPayload, RankingMatchDetail } from "@/lib/ranking.types";

type RankingDetailsPanelProps = {
  details: RankingDetailsPayload | undefined;
  isLoading: boolean;
};

function formatMatchDate(match: RankingMatchDetail): string {
  if (!match.match_date) return "—";
  const time = match.match_time?.slice(0, 5);
  return time ? `${formatDateBR(match.match_date)} ${time}` : formatDateBR(match.match_date);
}

function formatMatchLabel(match: RankingMatchDetail): string {
  if (match.opponent_name) {
    return `${match.competition} vs ${match.opponent_name}`;
  }
  return match.competition;
}

export function RankingDetailsPanel({ details, isLoading }: RankingDetailsPanelProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  const summary = details?.summary;
  const matches = details?.matches ?? [];

  return (
    <div className="px-4 sm:px-6 py-5 space-y-5">
      {summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <Stat label="Vitórias" value={String(summary.wins)} accent="text-green-600" />
          <Stat label="Derrotas" value={String(summary.losses)} accent="text-red-600" />
          <Stat label="Jogos" value={String(summary.games)} />
          <Stat label="Aproveit." value={`${summary.win_rate}%`} accent="text-primary" />
          <Stat
            label="Últimos 5"
            value={summary.last_five.length > 0 ? summary.last_five.join(" · ") : "—"}
          />
          <Stat
            label="Melhor set"
            value={summary.best_set_score != null ? String(summary.best_set_score) : "—"}
          />
          <Stat
            label="Atualizado"
            value={
              summary.last_updated ? formatDateBR(summary.last_updated.slice(0, 10)) : "—"
            }
          />
        </div>
      ) : null}

      {matches.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum resultado registrado ainda.
        </p>
      ) : (
        <div className="rounded-xl border border-border/70 bg-background overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold">Data</TableHead>
                <TableHead className="text-xs font-semibold">Competição / Partida</TableHead>
                <TableHead className="text-xs font-semibold">Resultado</TableHead>
                <TableHead className="text-xs font-semibold text-right">Pontos</TableHead>
                <TableHead className="text-xs font-semibold text-right hidden sm:table-cell">
                  Classificação
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((match, index) => (
                <TableRow key={`${match.competition}-${match.match_date}-${index}`}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatMatchDate(match)}
                  </TableCell>
                  <TableCell className="text-xs">{formatMatchLabel(match)}</TableCell>
                  <TableCell className="text-xs">
                    <span
                      className={
                        match.outcome === "V"
                          ? "text-green-600 font-semibold"
                          : match.outcome === "D"
                            ? "text-red-600 font-semibold"
                            : "text-muted-foreground"
                      }
                    >
                      {match.outcome}
                    </span>
                    {match.score_label !== "—" ? (
                      <span className="text-muted-foreground ml-1">{match.score_label}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium">
                    {match.points_gained !== 0 ? match.points_gained : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-right hidden sm:table-cell">
                    {match.rank_position ? `#${match.rank_position}` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function RankingDetailsRow({
  details,
  isLoading,
  colSpan,
}: RankingDetailsPanelProps & { colSpan: number }) {
  return (
    <TableRow className="bg-secondary/25 hover:bg-secondary/25 border-b">
      <TableCell colSpan={colSpan} className="p-0">
        <RankingDetailsPanel details={details} isLoading={isLoading} />
      </TableCell>
    </TableRow>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg bg-background border border-border/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

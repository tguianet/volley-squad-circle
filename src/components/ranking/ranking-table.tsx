import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RankingDetailsRow } from "@/components/ranking/ranking-details-row";
import {
  ArenaLabel,
  RankingMobileCard,
  PlayerChips,
  PointsCell,
  PositionBadge,
} from "@/components/ranking/ranking-mobile-card";
import {
  fetchPlayerRankingDetails,
  fetchTeamRankingDetails,
} from "@/lib/ranking.queries";
import type { RankingTableRow } from "@/lib/ranking.types";

type RankingTableProps = {
  rows: RankingTableRow[];
  isLoading: boolean;
  emptyMessage: string;
};

export function RankingTable({ rows, isLoading, emptyMessage }: RankingTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expandedRow = rows.find((r) => r.id === expandedId) ?? null;

  const detailsQ = useQuery({
    queryKey: ["ranking-details", expandedRow?.kind, expandedId],
    enabled: !!expandedRow && !!expandedId,
    queryFn: () =>
      expandedRow!.kind === "team"
        ? fetchTeamRankingDetails(expandedId!)
        : fetchPlayerRankingDetails(expandedId!),
  });

  function toggleRow(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground text-center py-10">Carregando…</p>;
  }

  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground shadow-card">{emptyMessage}</Card>
    );
  }

  return (
    <>
      <div className="md:hidden space-y-3">
        {rows.map((row, index) => (
          <RankingMobileCard
            key={row.id}
            row={row}
            displayPosition={index + 1}
            expanded={expandedId === row.id}
            onToggle={() => toggleRow(row.id)}
            details={expandedId === row.id ? detailsQ.data : undefined}
            detailsLoading={expandedId === row.id && detailsQ.isLoading}
          />
        ))}
      </div>

      <Card className="hidden md:block shadow-card border-border/60 overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40 hover:bg-secondary/40 border-b border-border/60">
              <TableHead className="w-16 text-xs font-semibold uppercase tracking-wide">
                #
              </TableHead>
              <TableHead className="min-w-[180px] text-xs font-semibold uppercase tracking-wide">
                Time / Jogador
              </TableHead>
              <TableHead className="min-w-[200px] text-xs font-semibold uppercase tracking-wide hidden lg:table-cell">
                Jogadores
              </TableHead>
              <TableHead className="min-w-[140px] text-xs font-semibold uppercase tracking-wide hidden md:table-cell">
                Arena
              </TableHead>
              <TableHead className="w-24 text-xs font-semibold uppercase tracking-wide text-center">
                Jogos
              </TableHead>
              <TableHead className="w-24 text-xs font-semibold uppercase tracking-wide text-right">
                Pontos
              </TableHead>
              <TableHead className="w-36 text-xs font-semibold uppercase tracking-wide text-right">
                Detalhes
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => {
              const displayPosition = index + 1;
              const isExpanded = expandedId === row.id;
              return (
                <Fragment key={row.id}>
                  <TableRow className="hover:bg-secondary/20 border-border/60">
                    <TableCell>
                      <PositionBadge position={displayPosition} />
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{row.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{row.categoryLabel}</div>
                      <div className="lg:hidden mt-2">
                        <PlayerChips players={row.players} compact />
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <PlayerChips players={row.players} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[180px]">
                      <ArenaLabel label={row.arenaLabel} />
                    </TableCell>
                    <TableCell className="text-center font-medium">{row.games}</TableCell>
                    <TableCell>
                      <PointsCell points={row.points} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-primary"
                        onClick={() => toggleRow(row.id)}
                      >
                        Mais detalhes
                        {isExpanded ? (
                          <ChevronUp className="size-4 ml-1" />
                        ) : (
                          <ChevronDown className="size-4 ml-1" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isExpanded ? (
                    <RankingDetailsRow
                      details={detailsQ.data}
                      isLoading={detailsQ.isLoading}
                      colSpan={7}
                    />
                  ) : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

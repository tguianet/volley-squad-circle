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
import { fetchPlayerRankingDetails, fetchTeamRankingDetails } from "@/lib/ranking.queries";
import type { RankingTableRow } from "@/lib/ranking.types";
import { cn } from "@/lib/utils";

type RankingTableProps = {
  rows: RankingTableRow[];
  isLoading: boolean;
  emptyMessage: string;
};

function rankLabel(position: number): string {
  return String(position).padStart(2, "0");
}

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
    return (
      <Card className="ranking-table-shell p-10 text-center text-sm text-muted-foreground">
        Carregando…
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="ranking-table-shell p-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </Card>
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

      <Card className="hidden md:block ranking-table-shell overflow-hidden p-0 border-0 shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="ranking-table-head hover:ranking-table-head border-0">
              <TableHead className="w-[72px] text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Rank
              </TableHead>
              <TableHead className="min-w-[180px] text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Time / Jogador
              </TableHead>
              <TableHead className="min-w-[200px] text-[11px] font-bold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">
                Jogadores
              </TableHead>
              <TableHead className="min-w-[140px] text-[11px] font-bold uppercase tracking-widest text-muted-foreground hidden md:table-cell">
                Arena
              </TableHead>
              <TableHead className="w-20 text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-center">
                Jogos
              </TableHead>
              <TableHead className="w-24 text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right">
                Pontos
              </TableHead>
              <TableHead className="w-36 text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right">
                Detalhes
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => {
              const displayPosition = index + 1;
              const isExpanded = expandedId === row.id;
              const isLeader = displayPosition === 1;

              return (
                <Fragment key={row.id}>
                  <TableRow
                    className={cn(
                      "ranking-table-row group border-0 transition-all",
                      isLeader && "ranking-table-row-leader",
                      index % 2 === 1 && "ranking-table-row-alt",
                    )}
                  >
                    <TableCell className="py-5">
                      {isLeader ? (
                        <PositionBadge position={displayPosition} />
                      ) : (
                        <span className="font-display text-2xl text-foreground/90 group-hover:scale-105 transition-transform inline-block">
                          {rankLabel(displayPosition)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-5">
                      <div
                        className={cn(
                          "font-display tracking-wide uppercase truncate",
                          isLeader ? "text-xl text-gradient" : "text-base text-foreground",
                        )}
                      >
                        {row.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                        {row.categoryLabel}
                      </div>
                      <div className="lg:hidden mt-2">
                        <PlayerChips players={row.players} compact />
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell py-5">
                      <PlayerChips players={row.players} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[180px] py-5">
                      <ArenaLabel label={row.arenaLabel} dark />
                    </TableCell>
                    <TableCell className="text-center font-semibold py-5">{row.games}</TableCell>
                    <TableCell className="py-5">
                      <PointsCell points={row.points} leader={isLeader} />
                    </TableCell>
                    <TableCell className="text-right py-5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-primary hover:bg-primary/10 text-xs font-semibold uppercase tracking-wide"
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

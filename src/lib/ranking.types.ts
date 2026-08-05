export type RankingPlayerChip = {
  id: string;
  name: string;
  avatar_url: string | null;
};

export const RANKING_ARENA_UNDEFINED = "Arena não definida";

export type RankingTableRow = {
  id: string;
  position: number;
  name: string;
  categoryLabel: string;
  players: RankingPlayerChip[];
  arenaLabel: string;
  games: number;
  points: number;
  kind: "individual" | "team";
};

export type RankingMatchDetail = {
  match_date: string | null;
  match_time?: string | null;
  competition: string;
  opponent_name?: string | null;
  outcome: string;
  score_label: string;
  points_gained: number;
  rank_position: number | null;
};

export type RankingDetailsSummary = {
  wins: number;
  losses: number;
  games: number;
  win_rate: number;
  points: number;
  rank_position: number | null;
  last_updated: string;
  last_five: string[];
  best_set_score: number | null;
};

export type RankingDetailsPayload = {
  summary: RankingDetailsSummary | null;
  matches: RankingMatchDetail[];
};

export type RankingSidebarEntry = {
  position: number;
  name: string;
  points: number;
  games: number;
};

export type RankingAnalytics = {
  totalEntries: number;
  totalGames: number;
  averagePoints: number;
  leader: RankingSidebarEntry | null;
  /** Entradas mais ativas (proxy de evolução com dados atuais). */
  movers: RankingSidebarEntry[];
  /** Top entradas com barra relativa ao líder. */
  distribution: Array<RankingSidebarEntry & { fillPercent: number }>;
};

export function buildRankingAnalytics(rows: RankingTableRow[]): RankingAnalytics {
  if (rows.length === 0) {
    return {
      totalEntries: 0,
      totalGames: 0,
      averagePoints: 0,
      leader: null,
      movers: [],
      distribution: [],
    };
  }

  const leaderRow = rows[0];
  const leaderPoints = Math.max(leaderRow.points, 1);

  const withPosition = rows.map((r, i) => ({ row: r, position: i + 1 }));

  const movers = withPosition
    .slice(1)
    .sort((a, b) => b.row.games - a.row.games || b.row.points - a.row.points)
    .slice(0, 2)
    .map(({ row, position }) => ({
      position,
      name: row.name,
      points: row.points,
      games: row.games,
    }));

  const distribution = rows.slice(0, 5).map((r, i) => ({
    position: i + 1,
    name: r.name,
    points: r.points,
    games: r.games,
    fillPercent: Math.round((r.points / leaderPoints) * 100),
  }));

  const totalGames = rows.reduce((sum, r) => sum + r.games, 0);
  const averagePoints = Math.round(rows.reduce((sum, r) => sum + r.points, 0) / rows.length);

  return {
    totalEntries: rows.length,
    totalGames,
    averagePoints,
    leader: {
      position: 1,
      name: leaderRow.name,
      points: leaderRow.points,
      games: leaderRow.games,
    },
    movers,
    distribution,
  };
}

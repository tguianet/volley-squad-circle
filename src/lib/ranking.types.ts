export type RankingPlayerChip = {
  id: string;
  name: string;
  avatar_url: string | null;
};

export type RankingTableRow = {
  id: string;
  position: number;
  name: string;
  categoryLabel: string;
  players: RankingPlayerChip[];
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

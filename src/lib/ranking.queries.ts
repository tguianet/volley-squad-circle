import { supabase } from "@/integrations/supabase/client";
import { isTeamRankingComplete } from "@/lib/team-format";
import type {
  RankingDetailsPayload,
  RankingMatchDetail,
  RankingPlayerChip,
  RankingTableRow,
} from "@/lib/ranking.types";

type GenderFilter = "M" | "F" | "X";

type ProfileRankRow = {
  id: string;
  display_name: string;
  apelido: string | null;
  username: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  level: string | null;
  genero: string | null;
  pontos: number;
  vitorias: number;
  derrotas: number;
};

type TeamRankRow = {
  id: string;
  name: string;
  category: "dupla" | "quarteto";
  gender: "M" | "F" | "X";
  points: number;
  wins: number;
  losses: number;
  captain_id: string;
  rank_position: number | null;
};

type TeamMemberRow = {
  team_id: string;
  profile: {
    id: string;
    display_name: string | null;
    apelido: string | null;
    avatar_url: string | null;
  } | null;
};

function genderLabel(gender: "M" | "F" | "X"): string {
  if (gender === "F") return "Feminino";
  if (gender === "X") return "Misto";
  return "Masculino";
}

function memberDisplayName(p: {
  display_name: string | null;
  apelido: string | null;
  username?: string | null;
}): string {
  return p.apelido ?? p.display_name ?? p.username ?? "Jogador";
}

function parseDetailsPayload(raw: unknown): RankingDetailsPayload {
  const data = raw as {
    summary?: RankingDetailsPayload["summary"];
    matches?: RankingMatchDetail[];
  } | null;
  return {
    summary: data?.summary ?? null,
    matches: data?.matches ?? [],
  };
}

export async function fetchIndividualRankingRows(
  gender: GenderFilter,
): Promise<RankingTableRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, apelido, username, avatar_url, city, state, level, genero, pontos, vitorias, derrotas",
    )
    .eq("genero", gender)
    .order("pontos", { ascending: false })
    .limit(200);
  if (error) throw error;

  const players = (data ?? []) as ProfileRankRow[];
  return players.map((p, index) => ({
    id: p.id,
    position: index + 1,
    name: p.display_name,
    categoryLabel: [p.city, p.state].filter(Boolean).join(", ") || (p.level ?? "Individual"),
    players: [
      {
        id: p.id,
        name: memberDisplayName(p),
        avatar_url: p.avatar_url,
      },
    ],
    games: p.vitorias + p.derrotas,
    points: p.pontos,
    kind: "individual",
  }));
}

export async function fetchTeamRankingRows(
  category: "dupla" | "quarteto",
  gender: GenderFilter,
): Promise<RankingTableRow[]> {
  const { data, error } = await supabase
    .from("teams")
    .select(
      "id, name, category, gender, points, wins, losses, captain_id, rank_position",
    )
    .eq("is_active", true)
    .eq("category", category)
    .eq("gender", gender)
    .order("rank_position", { ascending: true, nullsFirst: false })
    .order("points", { ascending: false })
    .order("wins", { ascending: false })
    .order("losses", { ascending: true });
  if (error) throw error;

  const teams = (data ?? []) as TeamRankRow[];
  if (teams.length === 0) return [];

  const teamIds = teams.map((t) => t.id);
  const { data: members, error: membersError } = await supabase
    .from("team_members")
    .select("team_id, profile:profile_id(id, display_name, apelido, avatar_url)")
    .in("team_id", teamIds);
  if (membersError) throw membersError;

  const counts: Record<string, number> = {};
  const byTeam: Record<string, RankingPlayerChip[]> = {};
  for (const row of (members ?? []) as TeamMemberRow[]) {
    counts[row.team_id] = (counts[row.team_id] ?? 0) + 1;
    if (!row.profile) continue;
    (byTeam[row.team_id] ??= []).push({
      id: row.profile.id,
      name: memberDisplayName(row.profile),
      avatar_url: row.profile.avatar_url,
    });
  }

  const completeTeams = teams.filter((t) =>
    isTeamRankingComplete(category, counts[t.id] ?? 0),
  );

  return completeTeams.map((t, index) => ({
    id: t.id,
    position: index + 1,
    name: t.name,
    categoryLabel: genderLabel(t.gender),
    players: byTeam[t.id] ?? [],
    games: t.wins + t.losses,
    points: t.points,
    kind: "team",
  }));
}

export async function fetchTeamRankingDetails(teamId: string): Promise<RankingDetailsPayload> {
  const { data, error } = await supabase.rpc("get_team_ranking_details", {
    p_team_id: teamId,
  });
  if (error) throw error;
  return parseDetailsPayload(data);
}

export async function fetchPlayerRankingDetails(
  profileId: string,
): Promise<RankingDetailsPayload> {
  const { data, error } = await supabase.rpc("get_player_ranking_details", {
    p_profile_id: profileId,
  });
  if (error) throw error;
  return parseDetailsPayload(data);
}

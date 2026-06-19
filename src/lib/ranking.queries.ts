import { supabase } from "@/integrations/supabase/client";
import { isTeamRankingComplete } from "@/lib/team-format";
import {
  RANKING_ARENA_UNDEFINED,
  type RankingDetailsPayload,
  type RankingMatchDetail,
  type RankingPlayerChip,
  type RankingTableRow,
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
  preferred_arena_id: string | null;
  preferred_arena: { name: string; city: string | null } | null;
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

type TeamMembershipArenaRow = {
  profile_id: string;
  team: { preferred_arena_id: string | null } | null;
};

type CaptainedTeamArenaRow = {
  captain_id: string;
  preferred_arena_id: string | null;
};

type MatchPlayerArenaRow = {
  player_id: string;
  match: { arena_id: string | null } | null;
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

function formatArenaName(arena: { name: string; city: string | null } | null | undefined): string | null {
  if (!arena?.name) return null;
  return arena.city ? `${arena.name} — ${arena.city}` : arena.name;
}

async function fetchArenaLabelsById(ids: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("arenas")
    .select("id, name, city")
    .in("id", uniqueIds);
  if (error) throw error;

  const map = new Map<string, string>();
  for (const arena of data ?? []) {
    map.set(arena.id, formatArenaName(arena) ?? arena.name);
  }
  return map;
}

async function buildProfileArenaMap(profileIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (profileIds.length === 0) return result;

  const profileToArenaId = new Map<string, string>();

  const { data: captainedTeams, error: captainedError } = await supabase
    .from("teams")
    .select("captain_id, preferred_arena_id")
    .in("captain_id", profileIds)
    .not("preferred_arena_id", "is", null);
  if (captainedError) throw captainedError;

  for (const row of (captainedTeams ?? []) as CaptainedTeamArenaRow[]) {
    if (row.preferred_arena_id && !profileToArenaId.has(row.captain_id)) {
      profileToArenaId.set(row.captain_id, row.preferred_arena_id);
    }
  }

  const missingAfterCaptain = profileIds.filter((id) => !profileToArenaId.has(id));
  if (missingAfterCaptain.length > 0) {
    const { data: memberships, error: membershipsError } = await supabase
      .from("team_members")
      .select("profile_id, team:team_id(preferred_arena_id)")
      .in("profile_id", missingAfterCaptain);
    if (membershipsError) throw membershipsError;

    for (const row of (memberships ?? []) as TeamMembershipArenaRow[]) {
      const arenaId = row.team?.preferred_arena_id;
      if (arenaId && !profileToArenaId.has(row.profile_id)) {
        profileToArenaId.set(row.profile_id, arenaId);
      }
    }
  }

  const missingAfterTeams = profileIds.filter((id) => !profileToArenaId.has(id));
  if (missingAfterTeams.length > 0) {
    const { data: matchPlayers, error: matchPlayersError } = await supabase
      .from("match_players")
      .select("player_id, match:match_id(arena_id)")
      .in("player_id", missingAfterTeams)
      .eq("status", "confirmed");
    if (matchPlayersError) throw matchPlayersError;

    const frequency = new Map<string, Map<string, number>>();
    for (const row of (matchPlayers ?? []) as MatchPlayerArenaRow[]) {
      const arenaId = row.match?.arena_id;
      if (!arenaId) continue;
      const byArena = frequency.get(row.player_id) ?? new Map<string, number>();
      byArena.set(arenaId, (byArena.get(arenaId) ?? 0) + 1);
      frequency.set(row.player_id, byArena);
    }

    for (const [profileId, counts] of frequency) {
      if (profileToArenaId.has(profileId)) continue;
      let bestArenaId: string | null = null;
      let bestCount = 0;
      for (const [arenaId, count] of counts) {
        if (count > bestCount) {
          bestCount = count;
          bestArenaId = arenaId;
        }
      }
      if (bestArenaId) profileToArenaId.set(profileId, bestArenaId);
    }
  }

  const arenaLabels = await fetchArenaLabelsById([...profileToArenaId.values()]);
  for (const [profileId, arenaId] of profileToArenaId) {
    const label = arenaLabels.get(arenaId);
    if (label) result.set(profileId, label);
  }

  return result;
}

function resolveTeamArenaLabel(
  team: TeamRankRow,
  memberIds: string[],
  profileArenaMap: Map<string, string>,
): string {
  const teamArena = formatArenaName(team.preferred_arena);
  if (teamArena) return teamArena;

  const captainArena = profileArenaMap.get(team.captain_id);
  if (captainArena) return captainArena;

  for (const memberId of memberIds) {
    const memberArena = profileArenaMap.get(memberId);
    if (memberArena) return memberArena;
  }

  return RANKING_ARENA_UNDEFINED;
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
  const profileArenaMap = await buildProfileArenaMap(players.map((p) => p.id));

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
    arenaLabel: profileArenaMap.get(p.id) ?? RANKING_ARENA_UNDEFINED,
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
      "id, name, category, gender, points, wins, losses, captain_id, rank_position, preferred_arena_id, preferred_arena:preferred_arena_id(name, city)",
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

  const profileIds = new Set<string>();
  for (const team of completeTeams) {
    profileIds.add(team.captain_id);
    for (const member of byTeam[team.id] ?? []) {
      profileIds.add(member.id);
    }
  }
  const profileArenaMap = await buildProfileArenaMap([...profileIds]);

  return completeTeams.map((t, index) => {
    const roster = byTeam[t.id] ?? [];
    return {
      id: t.id,
      position: index + 1,
      name: t.name,
      categoryLabel: genderLabel(t.gender),
      players: roster,
      arenaLabel: resolveTeamArenaLabel(t, roster.map((p) => p.id), profileArenaMap),
      games: t.wins + t.losses,
      points: t.points,
      kind: "team",
    };
  });
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

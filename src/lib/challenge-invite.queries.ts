import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PendingChallengeInvite = {
  id: string;
  status: Database["public"]["Enums"]["challenge_status"];
  scheduled_date: string | null;
  scheduled_time: string | null;
  created_at: string;
  challenged_team_id: string;
  challenger_team_id: string;
  isCaptain: boolean;
  challenger: {
    id: string;
    name: string;
    rank_position: number | null;
    category: Database["public"]["Enums"]["team_category"];
    gender: Database["public"]["Enums"]["team_gender"];
    captain_id: string;
  };
  challenged: {
    id: string;
    name: string;
    rank_position: number | null;
    category: Database["public"]["Enums"]["team_category"];
    gender: Database["public"]["Enums"]["team_gender"];
    captain_id: string;
  };
  arena: { id: string; name: string; city: string | null } | null;
  court: { id: string; number: number; name: string } | null;
};

type ChallengeRow = {
  id: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  created_at: string;
  challenged_team_id: string;
  challenger_team_id: string;
  challenger: PendingChallengeInvite["challenger"] | null;
  challenged: PendingChallengeInvite["challenged"] | null;
  arena: PendingChallengeInvite["arena"] | null;
  court: PendingChallengeInvite["court"] | null;
};

export async function fetchUserTeamIds(userId: string): Promise<string[]> {
  const ids = new Set<string>();

  const { data: memberships, error: memberErr } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("profile_id", userId);
  if (memberErr) throw memberErr;
  for (const m of memberships ?? []) ids.add(m.team_id);

  const { data: captained, error: capErr } = await supabase
    .from("teams")
    .select("id")
    .eq("captain_id", userId);
  if (capErr) throw capErr;
  for (const t of captained ?? []) ids.add(t.id);

  return [...ids];
}

export async function fetchPendingChallengeInvite(
  userId: string,
): Promise<PendingChallengeInvite | null> {
  const teamIds = await fetchUserTeamIds(userId);
  if (teamIds.length === 0) return null;

  const { data, error } = await supabase
    .from("challenges")
    .select(
      `
      id, status, scheduled_date, scheduled_time, created_at,
      challenged_team_id, challenger_team_id,
      challenger:teams!challenges_challenger_team_id_fkey(
        id, name, rank_position, category, gender, captain_id
      ),
      challenged:teams!challenges_challenged_team_id_fkey(
        id, name, rank_position, category, gender, captain_id
      ),
      arena:arenas(id, name, city),
      court:courts(id, number, name)
    `,
    )
    .eq("status", "pending")
    .in("challenged_team_id", teamIds)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as ChallengeRow;
  if (!row.challenger || !row.challenged) return null;

  return {
    id: row.id,
    status: row.status as PendingChallengeInvite["status"],
    scheduled_date: row.scheduled_date,
    scheduled_time: row.scheduled_time,
    created_at: row.created_at,
    challenged_team_id: row.challenged_team_id,
    challenger_team_id: row.challenger_team_id,
    isCaptain: row.challenged.captain_id === userId,
    challenger: row.challenger,
    challenged: row.challenged,
    arena: row.arena,
    court: row.court,
  };
}

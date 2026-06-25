import { supabase } from "@/integrations/supabase/client";
import type { TournamentListItem } from "@/lib/tournament.types";

const PUBLIC_STATUSES = [
  "open",
  "featured",
  "last_spots",
  "coming_soon",
  "closed",
  "finished",
] as const;

type TournamentRow = {
  id: string;
  title: string;
  category_label: string;
  event_date: string;
  start_time: string;
  entry_fee_cents: number;
  max_teams: number;
  format: TournamentListItem["format"];
  status: TournamentListItem["status"];
  is_featured: boolean;
  image_url: string | null;
  arena: { name: string; city: string | null } | null;
  registrations: { user_id: string; status: string }[] | null;
};

export async function fetchTournaments(userId?: string): Promise<TournamentListItem[]> {
  const { data, error } = await supabase
    .from("tournaments")
    .select(
      `
      id, title, category_label, event_date, start_time, entry_fee_cents, max_teams,
      format, status, is_featured, image_url,
      arena:arena_id(name, city),
      registrations:tournament_registrations(user_id, status)
    `,
    )
    .in("status", [...PUBLIC_STATUSES])
    .gte("event_date", new Date().toISOString().slice(0, 10))
    .order("event_date")
    .order("start_time");
  if (error) throw error;

  return ((data ?? []) as TournamentRow[]).map((row) => {
    const activeRegs = (row.registrations ?? []).filter((r) => r.status === "confirmed");
    return {
      id: row.id,
      title: row.title,
      category_label: row.category_label,
      event_date: row.event_date,
      start_time: row.start_time,
      entry_fee_cents: row.entry_fee_cents,
      max_teams: row.max_teams,
      format: row.format,
      status: row.status,
      is_featured: row.is_featured,
      image_url: row.image_url,
      enrolled_count: activeRegs.length,
      arena: row.arena,
      user_registered: userId
        ? activeRegs.some((r) => r.user_id === userId)
        : false,
    };
  });
}

export async function fetchTournamentStats(): Promise<{ active: number; registrations: number }> {
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, status")
    .in("status", ["open", "featured", "last_spots"]);
  if (error) throw error;

  const ids = (data ?? []).map((t) => t.id);
  if (ids.length === 0) return { active: 0, registrations: 0 };

  const { count, error: regError } = await supabase
    .from("tournament_registrations")
    .select("id", { count: "exact", head: true })
    .in("tournament_id", ids)
    .eq("status", "confirmed");
  if (regError) throw regError;

  return { active: ids.length, registrations: count ?? 0 };
}

export async function registerForTournament(tournamentId: string, userId: string) {
  const { error } = await supabase.from("tournament_registrations").insert({
    tournament_id: tournamentId,
    user_id: userId,
    status: "confirmed",
  });
  if (error) throw error;
}

export type MyTournamentEntry = {
  id: string;
  title: string;
  event_date: string;
  start_time: string;
  status: TournamentListItem["status"];
  arena_name: string | null;
};

export async function fetchMyTournaments(userId: string): Promise<MyTournamentEntry[]> {
  const { data, error } = await supabase
    .from("tournament_registrations")
    .select(
      `
      tournament:tournament_id(
        id, title, event_date, start_time, status,
        arena:arena_id(name)
      )
    `,
    )
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .order("registered_at", { ascending: false })
    .limit(5);
  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const t = row.tournament as {
        id: string;
        title: string;
        event_date: string;
        start_time: string;
        status: TournamentListItem["status"];
        arena: { name: string } | null;
      } | null;
      if (!t) return null;
      return {
        id: t.id,
        title: t.title,
        event_date: t.event_date,
        start_time: t.start_time,
        status: t.status,
        arena_name: t.arena?.name ?? null,
      };
    })
    .filter((x): x is MyTournamentEntry => x !== null);
}

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// =====================================================================
// ARENAS
// =====================================================================
export const listArenas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("arenas")
      .select("id, name, city, address, cover_url, rating, is_active")
      .eq("is_active", true)
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createArena = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      name: z.string().min(1).max(120),
      city: z.string().max(120).optional(),
      address: z.string().max(255).optional(),
      cover_url: z.string().url().optional().or(z.literal("")),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("arenas")
      .insert({
        name: data.name,
        city: data.city || null,
        address: data.address || null,
        cover_url: data.cover_url || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// =====================================================================
// PROFILES
// =====================================================================
export const listProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .order("display_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// =====================================================================
// TEAMS
// =====================================================================
export const listTeams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("teams")
      .select(`
        id, name, category, gender, captain_id, preferred_arena_id,
        rank_position, points, wins, losses, current_streak, is_active,
        members:team_members(profile:profiles(id, display_name, avatar_url))
      `)
      .eq("is_active", true)
      .order("points", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyTeams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: memberships, error: mErr } = await context.supabase
      .from("team_members")
      .select("team_id")
      .eq("profile_id", context.userId);
    if (mErr) throw new Error(mErr.message);
    const ids = (memberships ?? []).map((m) => m.team_id);
    if (ids.length === 0) {
      // also include teams where i'm captain even with no members yet
      const { data: captained } = await context.supabase
        .from("teams")
        .select("*")
        .eq("captain_id", context.userId);
      return captained ?? [];
    }
    const { data, error } = await context.supabase
      .from("teams")
      .select("*")
      .or(`id.in.(${ids.join(",")}),captain_id.eq.${context.userId}`);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      name: z.string().min(2).max(80),
      category: z.enum(["dupla", "quarteto"]),
      gender: z.enum(["M", "F", "X"]).default("M"),
      preferred_arena_id: z.string().uuid().optional().nullable(),
      member_profile_ids: z.array(z.string().uuid()).max(4).default([]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: team, error } = await context.supabase
      .from("teams")
      .insert({
        name: data.name,
        category: data.category,
        gender: data.gender,
        captain_id: context.userId,
        preferred_arena_id: data.preferred_arena_id ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // include captain as member + provided members
    const memberRows = Array.from(new Set([context.userId, ...data.member_profile_ids]))
      .map((pid) => ({ team_id: team.id, profile_id: pid }));
    const { error: memErr } = await context.supabase.from("team_members").insert(memberRows);
    if (memErr) console.error("[createTeam] members:", memErr.message);

    // generate availability for current month
    const month = new Date();
    month.setDate(1);
    const monthStr = month.toISOString().slice(0, 10);
    // simple: call rpc not exposed; insert directly for this team
    const { data: sundays } = await context.supabase.rpc("get_sundays_of_month", {
      _month: monthStr,
    });
    if (sundays && Array.isArray(sundays)) {
      const rows = (sundays as Array<{ sunday_date: string }>).map((s) => ({
        team_id: team.id,
        month: monthStr,
        sunday_date: s.sunday_date,
        is_available: false,
      }));
      if (rows.length > 0) {
        await context.supabase.from("team_monthly_availability").upsert(rows, {
          onConflict: "team_id,sunday_date",
        });
      }
    }

    return team;
  });

// =====================================================================
// AVAILABILITY
// =====================================================================
function firstOfMonthISO(d = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  return x.toISOString().slice(0, 10);
}

export const getTeamAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      teamId: z.string().uuid(),
      month: z.string().optional(), // YYYY-MM-DD first day
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const month = data.month ?? firstOfMonthISO();
    // ensure rows exist (best effort, for this captain only)
    const { data: team } = await context.supabase
      .from("teams")
      .select("captain_id")
      .eq("id", data.teamId)
      .single();
    if (team?.captain_id === context.userId) {
      const { data: sundays } = await context.supabase.rpc("get_sundays_of_month", {
        _month: month,
      });
      if (sundays && Array.isArray(sundays)) {
        const rows = (sundays as Array<{ sunday_date: string }>).map((s) => ({
          team_id: data.teamId,
          month,
          sunday_date: s.sunday_date,
          is_available: false,
        }));
        if (rows.length > 0) {
          await context.supabase
            .from("team_monthly_availability")
            .upsert(rows, { onConflict: "team_id,sunday_date", ignoreDuplicates: true });
        }
      }
    }
    const { data: rows, error } = await context.supabase
      .from("team_monthly_availability")
      .select("id, sunday_date, is_available, time_start, time_end, arena_id")
      .eq("team_id", data.teamId)
      .eq("month", month)
      .order("sunday_date");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertSundayAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      teamId: z.string().uuid(),
      sundayDate: z.string(), // YYYY-MM-DD
      isAvailable: z.boolean(),
      timeStart: z.string().nullable().optional(),
      timeEnd: z.string().nullable().optional(),
      arenaId: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const month = data.sundayDate.slice(0, 7) + "-01";
    const { error } = await context.supabase
      .from("team_monthly_availability")
      .upsert(
        {
          team_id: data.teamId,
          month,
          sunday_date: data.sundayDate,
          is_available: data.isAvailable,
          time_start: data.isAvailable ? data.timeStart || null : null,
          time_end: data.isAvailable ? data.timeEnd || null : null,
          arena_id: data.isAvailable ? data.arenaId || null : null,
        },
        { onConflict: "team_id,sunday_date" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =====================================================================
// CHALLENGES
// =====================================================================
type Overlap = {
  sunday_date: string;
  overlap_start: string;
  overlap_end: string;
  challenger_arena_id: string | null;
  challenged_arena_id: string | null;
};

function overlapTimes(
  a: { start: string | null; end: string | null },
  b: { start: string | null; end: string | null },
): { start: string; end: string } | null {
  if (!a.start || !a.end || !b.start || !b.end) return null;
  const start = a.start > b.start ? a.start : b.start;
  const end = a.end < b.end ? a.end : b.end;
  if (start >= end) return null;
  return { start, end };
}

export const findCommonSundays = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      challengerTeamId: z.string().uuid(),
      challengedTeamId: z.string().uuid(),
      month: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }): Promise<Overlap[]> => {
    const month = data.month ?? firstOfMonthISO();
    const { data: rows, error } = await context.supabase
      .from("team_monthly_availability")
      .select("team_id, sunday_date, is_available, time_start, time_end, arena_id")
      .in("team_id", [data.challengerTeamId, data.challengedTeamId])
      .eq("month", month)
      .eq("is_available", true);
    if (error) throw new Error(error.message);

    const bySundayChallenger = new Map<string, typeof rows[number]>();
    const bySundayChallenged = new Map<string, typeof rows[number]>();
    for (const r of rows ?? []) {
      if (r.team_id === data.challengerTeamId) bySundayChallenger.set(r.sunday_date, r);
      else bySundayChallenged.set(r.sunday_date, r);
    }
    const out: Overlap[] = [];
    for (const [sunday, ch] of bySundayChallenger) {
      const cd = bySundayChallenged.get(sunday);
      if (!cd) continue;
      const ov = overlapTimes(
        { start: ch.time_start, end: ch.time_end },
        { start: cd.time_start, end: cd.time_end },
      );
      if (!ov) continue;
      out.push({
        sunday_date: sunday,
        overlap_start: ov.start,
        overlap_end: ov.end,
        challenger_arena_id: ch.arena_id,
        challenged_arena_id: cd.arena_id,
      });
    }
    out.sort((a, b) => a.sunday_date.localeCompare(b.sunday_date));
    return out;
  });

export const createChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      challengerTeamId: z.string().uuid(),
      challengedTeamId: z.string().uuid(),
      date: z.string(), // YYYY-MM-DD
      time: z.string(), // HH:MM
      arenaId: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("challenges")
      .insert({
        challenger_team_id: data.challengerTeamId,
        challenged_team_id: data.challengedTeamId,
        scheduled_date: data.date,
        scheduled_time: data.time,
        arena_id: data.arenaId ?? null,
        status: "pending",
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const respondToChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      challengeId: z.string().uuid(),
      action: z.enum(["accept", "decline", "reschedule"]),
      reason: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const next =
      data.action === "accept"
        ? "scheduled"
        : data.action === "decline"
          ? "declined"
          : "reschedule_requested";
    const { error } = await context.supabase
      .from("challenges")
      .update({
        status: next,
        responded_at: new Date().toISOString(),
        reschedule_reason: data.action === "reschedule" ? (data.reason ?? null) : null,
      })
      .eq("id", data.challengeId);
    if (error) throw new Error(error.message);
    return { ok: true, status: next };
  });

export const listMyChallenges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // teams where i'm captain
    const { data: teams } = await context.supabase
      .from("teams")
      .select("id")
      .eq("captain_id", context.userId);
    const ids = (teams ?? []).map((t) => t.id);
    if (ids.length === 0) return { sent: [], received: [] };

    const { data: rows, error } = await context.supabase
      .from("challenges")
      .select(`
        id, status, scheduled_date, scheduled_time, arena_id, reschedule_reason,
        challenger:teams!challenges_challenger_team_id_fkey(id, name, rank_position),
        challenged:teams!challenges_challenged_team_id_fkey(id, name, rank_position),
        arena:arenas(id, name)
      `)
      .or(`challenger_team_id.in.(${ids.join(",")}),challenged_team_id.in.(${ids.join(",")})`)
      .order("scheduled_date", { ascending: true });
    if (error) throw new Error(error.message);

    const sent: typeof rows = [];
    const received: typeof rows = [];
    for (const r of rows ?? []) {
      if (ids.includes((r.challenger as { id: string }).id)) sent.push(r);
      else received.push(r);
    }
    return { sent, received };
  });

// Public — used in the public /ranking page; no auth required.
export const listScheduledChallenges = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabaseAdmin
      .from("challenges")
      .select(`
        id, scheduled_date, scheduled_time,
        challenger:teams!challenges_challenger_team_id_fkey(id, name, rank_position),
        challenged:teams!challenges_challenged_team_id_fkey(id, name, rank_position),
        arena:arenas(id, name)
      `)
      .eq("status", "scheduled")
      .gte("scheduled_date", today)
      .order("scheduled_date")
      .order("scheduled_time")
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

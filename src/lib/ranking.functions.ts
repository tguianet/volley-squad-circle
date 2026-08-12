import { untyped } from "@/lib/supabase-untyped";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  CHALLENGE_INVALID_MESSAGE,
  canChallengeTeam,
  isTeamComplete,
  isUserTeamCaptain,
} from "@/lib/challenge-rules";
import { supabase } from "@/integrations/supabase/client";
import { isMissingRpcError, normalizeProfileHandle } from "@/lib/media-url";
import type { PublicProfileConnection } from "@/lib/profile-follow.types";
import { firstDayOfMonth, validateAvailabilityInput } from "@/lib/team-availability";

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
    z
      .object({
        name: z.string().min(1).max(120),
        city: z.string().max(120).optional(),
        address: z.string().max(255).optional(),
        cover_url: z.string().url().optional().or(z.literal("")),
      })
      .parse(d),
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
      .select(
        `
        id, name, category, gender, captain_id, preferred_arena_id,
        rank_position, points, wins, losses, current_streak, is_active,
        members:team_members(profile:profiles(id, display_name, avatar_url))
      `,
      )
      .eq("is_active", true)
      .order("rank_position", { ascending: true, nullsFirst: false });
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
        .select(
          `
          id, name, category, gender, captain_id, preferred_arena_id,
          rank_position, points, wins, losses, current_streak, is_active,
          members:team_members(profile:profiles(id, display_name, avatar_url))
        `,
        )
        .eq("captain_id", context.userId);
      return captained ?? [];
    }
    const { data, error } = await context.supabase
      .from("teams")
      .select(
        `
        id, name, category, gender, captain_id, preferred_arena_id,
        rank_position, points, wins, losses, current_streak, is_active,
        members:team_members(profile:profiles(id, display_name, avatar_url))
      `,
      )
      .or(`id.in.(${ids.join(",")}),captain_id.eq.${context.userId}`);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().min(2).max(80),
        category: z.enum(["dupla", "quarteto"]),
        gender: z.enum(["M", "F", "X"]).default("M"),
        preferred_arena_id: z.string().uuid().optional().nullable(),
        member_profile_ids: z.array(z.string().uuid()).max(4).default([]),
      })
      .parse(d),
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
    const memberRows = Array.from(new Set([context.userId, ...data.member_profile_ids])).map(
      (pid) => ({ team_id: team.id, profile_id: pid }),
    );
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
export const getTeamAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        teamId: z.string().uuid(),
        month: z.string().optional(), // YYYY-MM-DD first day
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const month = data.month ?? firstDayOfMonth();
    if (!/^\d{4}-\d{2}-01$/.test(month)) throw new Error("Mês inválido.");
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
      .select("id, sunday_date, is_available, time_start, time_end, arena_id, court_id")
      .eq("team_id", data.teamId)
      .eq("month", month)
      .order("sunday_date");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertSundayAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        teamId: z.string().uuid(),
        sundayDate: z.string(), // YYYY-MM-DD
        isAvailable: z.boolean(),
        timeStart: z.string().nullable().optional(),
        timeEnd: z.string().nullable().optional(),
        arenaId: z.string().uuid().nullable().optional(),
        courtId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const validationError = validateAvailabilityInput({
      sundayDate: data.sundayDate,
      isAvailable: data.isAvailable,
      timeStart: data.timeStart,
      timeEnd: data.timeEnd,
      arenaId: data.arenaId,
    });
    if (validationError) throw new Error(validationError);

    const month = data.sundayDate.slice(0, 7) + "-01";
    const { data: team, error: teamError } = await context.supabase
      .from("teams")
      .select("captain_id")
      .eq("id", data.teamId)
      .single();
    if (teamError || !team) throw new Error("Equipe não encontrada.");
    if (team.captain_id !== context.userId) {
      throw new Error("Somente o capitão pode alterar a disponibilidade.");
    }

    const { error } = await context.supabase.from("team_monthly_availability").upsert(
      {
        team_id: data.teamId,
        month,
        sunday_date: data.sundayDate,
        is_available: data.isAvailable,
        time_start: data.isAvailable ? data.timeStart || null : null,
        time_end: data.isAvailable ? data.timeEnd || null : null,
        arena_id: data.isAvailable ? data.arenaId : null,
        court_id: data.isAvailable ? data.courtId || null : null,
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

export type ChallengeAvailabilityOverlap = Overlap;

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
    z
      .object({
        challengerTeamId: z.string().uuid(),
        challengedTeamId: z.string().uuid(),
        month: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<Overlap[]> => {
    const month = data.month ?? firstDayOfMonth();
    const monthEndDate = new Date(`${month}T12:00:00`);
    monthEndDate.setMonth(monthEndDate.getMonth() + 3);
    const monthEnd = data.month ? month : monthEndDate.toISOString().slice(0, 10);
    const { data: rows, error } = await context.supabase
      .from("team_monthly_availability")
      .select("team_id, sunday_date, is_available, time_start, time_end, arena_id")
      .in("team_id", [data.challengerTeamId, data.challengedTeamId])
      .gte("month", month)
      .lte("month", monthEnd)
      .eq("is_available", true);
    if (error) throw new Error(error.message);

    const bySundayChallenger = new Map<string, (typeof rows)[number]>();
    const bySundayChallenged = new Map<string, (typeof rows)[number]>();
    for (const r of rows ?? []) {
      if (r.team_id === data.challengerTeamId) bySundayChallenger.set(r.sunday_date, r);
      else bySundayChallenged.set(r.sunday_date, r);
    }
    const out: Overlap[] = [];
    for (const [sunday, ch] of bySundayChallenger) {
      const cd = bySundayChallenged.get(sunday);
      if (!cd) continue;
      if (!ch.arena_id || ch.arena_id !== cd.arena_id) continue;
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
    z
      .object({
        challengerTeamId: z.string().uuid(),
        challengedTeamId: z.string().uuid(),
        date: z.string(), // YYYY-MM-DD (domingo)
        time: z.string(), // HH:MM
        courtId: z.string().uuid(),
        arenaId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const hour = parseInt(data.time.slice(0, 2), 10);
    if (Number.isNaN(hour) || hour < 8 || hour > 16) {
      throw new Error("Horário fora da janela permitida (08:00 às 17:00).");
    }

    const { data: challenger, error: chErr } = await context.supabase
      .from("teams")
      .select(
        `
        id, captain_id, category, gender, rank_position, is_active,
        members:team_members(profile_id)
      `,
      )
      .eq("id", data.challengerTeamId)
      .maybeSingle();
    if (chErr) throw new Error(chErr.message);

    const { data: challenged, error: cdErr } = await context.supabase
      .from("teams")
      .select(
        `
        id, category, gender, rank_position, is_active,
        members:team_members(profile_id)
      `,
      )
      .eq("id", data.challengedTeamId)
      .maybeSingle();
    if (cdErr) throw new Error(cdErr.message);

    const challengerMemberCount = challenger?.members?.length ?? 0;
    const challengedMemberCount = challenged?.members?.length ?? 0;

    const rankingValid =
      challenger &&
      challenged &&
      challenger.is_active &&
      challenged.is_active &&
      isUserTeamCaptain(challenger, context.userId) &&
      challenger.rank_position != null &&
      challenged.rank_position != null &&
      challenger.category === challenged.category &&
      challenger.gender === challenged.gender &&
      isTeamComplete(challenger.category as "dupla" | "quarteto", challengerMemberCount) &&
      isTeamComplete(challenged.category as "dupla" | "quarteto", challengedMemberCount) &&
      canChallengeTeam(challenger.rank_position, challenged.rank_position);

    if (!rankingValid) {
      throw new Error(CHALLENGE_INVALID_MESSAGE);
    }

    const { data: row, error } = await untyped(context.supabase).rpc("create_challenge_with_hold", {
      p_challenger_team_id: data.challengerTeamId,
      p_challenged_team_id: data.challengedTeamId,
      p_scheduled_date: data.date,
      p_scheduled_time: data.time,
      p_arena_id: data.arenaId,
      p_court_id: data.courtId,
    });
    if (error) {
      if (error.message.includes("Desafio inválido pelas regras do ranking")) {
        throw new Error(CHALLENGE_INVALID_MESSAGE);
      }
      throw new Error(error.message);
    }
    return row;
  });

export const getAvailableChallengeCourts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        date: z.string(),
        time: z.string(),
        arenaId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const [hours, minutes] = data.time.slice(0, 5).split(":").map(Number);
    const endMinutes = hours * 60 + minutes + 60;
    const end = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    const { data: rows, error } = await untyped(context.supabase).rpc("get_available_courts", {
      p_match_date: data.date,
      p_start_time: data.time,
      p_end_time: end,
      p_arena_id: data.arenaId,
    });
    if (error) throw new Error(error.message);
    const available = (rows ?? []) as Array<{ court_number: number; court_name: string }>;
    if (available.length === 0) return [];
    const { data: courts, error: courtsError } = await context.supabase
      .from("courts")
      .select("id, number, name")
      .in(
        "number",
        available.map((court) => court.court_number),
      )
      .eq("is_active", true);
    if (courtsError) throw new Error(courtsError.message);
    return (courts ?? []).map((court) => ({
      court_id: court.id,
      court_number: court.number,
      court_name: court.name,
    }));
  });

export const respondToChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        challengeId: z.string().uuid(),
        action: z.enum(["accept", "decline", "reschedule"]),
        reason: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: challenge, error: fetchErr } = await context.supabase
      .from("challenges")
      .select(
        `
        id, status, challenged_team_id, challenger_team_id,
        scheduled_date, scheduled_time, court_id, arena_id, duration_minutes,
        challenger:teams!challenges_challenger_team_id_fkey(id, name, captain_id),
        challenged:teams!challenges_challenged_team_id_fkey(id, name, captain_id),
        court:courts(id, number, name),
        arena:arenas(name, city)
      `,
      )
      .eq("id", data.challengeId)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!challenge) throw new Error("Desafio não encontrado.");
    if (challenge.status !== "pending") {
      throw new Error("Este desafio não está mais pendente.");
    }

    const challengedTeam = challenge.challenged as {
      id: string;
      name: string;
      captain_id: string;
    } | null;
    if (!challengedTeam) throw new Error("Time desafiado não encontrado.");

    if (!isUserTeamCaptain(challengedTeam, context.userId)) {
      const isAdmin = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (isAdmin.data !== true) {
        throw new Error("Somente o capitão pode aceitar ou recusar este desafio.");
      }
    }

    const { data: updated, error } = await untyped(context.supabase).rpc(
      "respond_to_challenge_invitation",
      {
        p_challenge_id: data.challengeId,
        p_action: data.action,
        p_reason: data.reason ?? null,
      },
    );
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Não foi possível responder ao desafio.");
    const next = (updated as { status: string }).status;
    if (next === "expired") {
      throw new Error("Este convite expirou e a quadra foi liberada.");
    }

    const dt = challenge.scheduled_date
      ? new Date(challenge.scheduled_date + "T12:00:00").toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        })
      : "";
    const timeLabel = challenge.scheduled_time?.slice(0, 5) ?? "";
    const courtName =
      (challenge.court as { name?: string; number?: number } | null)?.name ??
      `Quadra ${(challenge.court as { number?: number } | null)?.number ?? ""}`;
    const arenaName = (challenge.arena as { name?: string } | null)?.name ?? "Arena";
    const challengerName =
      (challenge.challenger as { name?: string } | null)?.name ?? "Time desafiante";
    const challengedName = challengedTeam.name;

    async function notifyTeamMembers(teamId: string, title: string, body: string) {
      const { data: members } = await context.supabase
        .from("team_members")
        .select("profile_id")
        .eq("team_id", teamId);
      const { data: teamRow } = await context.supabase
        .from("teams")
        .select("captain_id")
        .eq("id", teamId)
        .maybeSingle();

      const userIds = new Set<string>();
      for (const m of members ?? []) userIds.add(m.profile_id);
      if (teamRow?.captain_id) userIds.add(teamRow.captain_id);

      if (userIds.size === 0) return;

      await context.supabase.from("notifications").insert(
        [...userIds].map((user_id) => ({
          user_id,
          kind: data.action === "accept" ? "challenge_accepted" : "challenge_declined",
          title,
          body,
          link_url: "/desafios",
        })),
      );
    }

    if (data.action === "accept") {
      await notifyTeamMembers(
        challenge.challenger_team_id,
        "Desafio aceito",
        `${challengedName} aceitou o desafio. ${dt} às ${timeLabel} — ${courtName}, ${arenaName}.`,
      );
      await notifyTeamMembers(
        challenge.challenged_team_id,
        "Desafio aceito",
        `Desafio confirmado contra ${challengerName}. ${dt} às ${timeLabel} — ${courtName}, ${arenaName}.`,
      );
    } else if (data.action === "decline") {
      await notifyTeamMembers(
        challenge.challenger_team_id,
        "Desafio recusado",
        `${challengedName} recusou o desafio de ${challengerName}.`,
      );
    }

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

    const { data: rawRows, error } = await untyped(context.supabase)
      .from("challenges")
      .select(
        `
        id, status, scheduled_date, scheduled_time, arena_id, reschedule_reason, duration_minutes, created_at,
        score_challenger, score_challenged, score_registered_by, score_registered_at, score_confirmed_by, score_confirmed_at,
        score_admin_review_requested_by, score_admin_review_requested_at,
        challenger:teams!challenges_challenger_team_id_fkey(id, name, rank_position),
        challenged:teams!challenges_challenged_team_id_fkey(id, name, rank_position),
        arena:arenas(id, name),
        court:courts(id, number, name)
      `,
      )
      .or(`challenger_team_id.in.(${ids.join(",")}),challenged_team_id.in.(${ids.join(",")})`)
      .order("created_at", { ascending: false });
    if (error) throw new Error((error as { message: string }).message);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (rawRows ?? []) as Array<Record<string, any>>;
    const sent: typeof rows = [];
    const received: typeof rows = [];
    for (const r of rows) {
      if (ids.includes((r.challenger as { id: string }).id)) sent.push(r);
      else received.push(r);
    }
    return { sent, received };
  });

// Public — used in the public /ranking page; no auth required.
export const listScheduledChallenges = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await untyped().rpc("list_scheduled_challenges_public");
  if (error) throw new Error(error.message);
  type Row = {
    id: string;
    scheduled_date: string;
    scheduled_time: string;
    challenger_id: string;
    challenger_name: string;
    challenger_rank: number | null;
    challenged_id: string;
    challenged_name: string;
    challenged_rank: number | null;
    arena_id: string | null;
    arena_name: string | null;
  };
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    scheduled_date: r.scheduled_date,
    scheduled_time: r.scheduled_time,
    challenger: { id: r.challenger_id, name: r.challenger_name, rank_position: r.challenger_rank },
    challenged: { id: r.challenged_id, name: r.challenged_name, rank_position: r.challenged_rank },
    arena: r.arena_id ? { id: r.arena_id, name: r.arena_name } : null,
  }));
});

// =====================================================================
// COURTS & SCHEDULING
// =====================================================================
export const listCourts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("courts")
      .select("id, number, name, is_active")
      .eq("is_active", true)
      .order("number");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCourtAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ date: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("court_availability", {
      _date: data.date,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const scheduleChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        challengeId: z.string().uuid(),
        date: z.string(),
        time: z.string(),
        courtId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("schedule_challenge", {
      _challenge_id: data.challengeId,
      _date: data.date,
      _time: data.time,
      _court_id: data.courtId,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const reportWalkover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ challengeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await untyped(context.supabase).rpc("report_challenge_walkover", {
      p_challenge_id: data.challengeId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSundayAgenda = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ date: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("challenges")
      .select(
        `
        id, scheduled_date, scheduled_time, duration_minutes, status,
        court:courts(id, number, name),
        challenger:teams!challenges_challenger_team_id_fkey(id, name),
        challenged:teams!challenges_challenged_team_id_fkey(id, name)
      `,
      )
      .eq("scheduled_date", data.date)
      .eq("status", "scheduled")
      .order("scheduled_time");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// =====================================================================
// SCORE CONFIRMATION
// =====================================================================
export const registerScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        challengeId: z.string().uuid(),
        scoreChallenger: z.number().int().min(0),
        scoreChallenged: z.number().int().min(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("register_challenge_score", {
      _challenge_id: data.challengeId,
      _score_challenger: data.scoreChallenger,
      _score_challenged: data.scoreChallenged,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const confirmScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ challengeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("confirm_challenge_score", {
      _challenge_id: data.challengeId,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const disputeScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ challengeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("reject_challenge_score", {
      _challenge_id: data.challengeId,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const requestAdminScoreReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ challengeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await untyped(context.supabase).rpc(
      "request_challenge_score_admin_review",
      { _challenge_id: data.challengeId },
    );
    if (error) throw new Error(error.message);
    return row;
  });

// =====================================================================
// PROFILE LINKS
// =====================================================================
export const searchProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        searchTerm: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("search_profiles", {
      search_term: data.searchTerm,
      exclude_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const sendProfileLinkRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        targetId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("send_profile_link_request", {
      p_target_id: data.targetId,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const respondToProfileLinkRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        linkId: z.string().uuid(),
        status: z.enum(["accepted", "rejected"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("respond_to_profile_link_request", {
      p_link_id: data.linkId,
      p_status: data.status,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const listMyProfileLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("list_my_profile_links");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listPendingLinkRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("list_pending_link_requests");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const searchPublicProfiles = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        searchTerm: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabase.rpc("search_profiles", {
      search_term: data.searchTerm,
      exclude_id: undefined,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPublicProfileByUsername = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        username: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const username = normalizeProfileHandle(data.username);
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(username)
    ) {
      const { data: profile, error: idError } = await supabase
        .from("profiles")
        .select(
          "id, display_name, username, apelido, bio, city, state, whatsapp, instagram, posicao_principal, level, mao_dominante, altura, avatar_url, banner_url, genero, status, pontos, vitorias, derrotas",
        )
        .eq("id", username)
        .maybeSingle();
      if (idError) throw new Error(idError.message);
      if (profile) return profile;
    }
    const { data: rows, error } = await supabase.rpc("get_public_profile_by_username", {
      p_username: username,
    });
    if (error) throw new Error(error.message);
    return rows?.[0] ?? null;
  });

export const getProfileLinkStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        targetId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: link, error } = await context.supabase
      .from("profile_links")
      .select("*")
      .or(
        `and(requester_id.eq.${context.userId},target_id.eq.${data.targetId}),and(requester_id.eq.${data.targetId},target_id.eq.${context.userId})`,
      )
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(error.message);
    }

    if (!link) {
      return { status: "none" as const };
    }

    return {
      status: link.status as "pending" | "accepted" | "rejected",
      isRequester: link.requester_id === context.userId,
    };
  });

// =====================================================================
// PROFILE FOLLOWS
// =====================================================================

export const followProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        profileId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await untyped(context.supabase).rpc("follow_profile", {
      p_profile_id: data.profileId,
    });
    if (error) throw new Error(error.message);
    const result = row as { error?: string; success?: boolean };
    if (result?.error) throw new Error(result.error);
    return row;
  });

export const unfollowProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        profileId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await untyped(context.supabase).rpc("unfollow_profile", {
      p_profile_id: data.profileId,
    });
    if (error) throw new Error(error.message);
    const result = row as { error?: string; success?: boolean };
    if (result?.error) throw new Error(result.error);
    return row;
  });

export const listMyFollowedProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await untyped(context.supabase).rpc("list_my_followed_profiles");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listFollowedProfilesFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await untyped(context.supabase).rpc(
      "list_followed_profiles_feed",
      {
        p_limit: 30,
      },
    );
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getProfileFollowStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        profileId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await untyped(context.supabase).rpc("get_profile_follow_status", {
      p_profile_id: data.profileId,
    });
    if (error) throw new Error(error.message);
    const result = row as { following?: boolean };
    return { following: result?.following ?? false };
  });

export const listPublicProfileFollows = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        profileId: z.string().uuid(),
        limit: z.number().int().min(1).max(24).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabase.rpc("list_public_profile_follows", {
      p_profile_id: data.profileId,
      p_limit: data.limit ?? 9,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as PublicProfileConnection[];
  });

export const listPublicProfileFollowers = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        profileId: z.string().uuid(),
        limit: z.number().int().min(1).max(24).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabase.rpc("list_public_profile_followers", {
      p_profile_id: data.profileId,
      p_limit: data.limit ?? 12,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as PublicProfileConnection[];
  });

export const listPublicProfileUpdates = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        profileId: z.string().uuid(),
        limit: z.number().int().min(1).max(30).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabase.rpc("list_public_profile_updates", {
      p_profile_id: data.profileId,
      p_limit: data.limit ?? 10,
    });
    if (error) {
      if (isMissingRpcError(error.message)) return [];
      throw new Error(error.message);
    }
    return rows ?? [];
  });

export const listPublicProfileGallery = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        profileId: z.string().uuid(),
        limit: z.number().int().min(1).max(24).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabase.rpc("list_public_profile_gallery", {
      p_profile_id: data.profileId,
      p_limit: data.limit ?? 9,
    });
    if (error) {
      if (isMissingRpcError(error.message)) return [];
      throw new Error(error.message);
    }
    return rows ?? [];
  });

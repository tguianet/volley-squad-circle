import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { z } from "zod";
import { untyped } from "@/lib/supabase-untyped";

type AdminContext = { supabase: SupabaseClient<Database>; userId: string };
type PendingAdminScoreReview = {
  id: string;
  score_challenger: number;
  score_challenged: number;
  score_registered_at: string;
  score_admin_review_requested_at: string;
  challenger: { name: string } | null;
  challenged: { name: string } | null;
};

async function assertAdmin(context: AdminContext, requireFullAdmin = false) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error("Falha ao verificar permissão");
  const roles = (data ?? []).map((r) => r.role);
  const ok = requireFullAdmin
    ? roles.includes("admin")
    : roles.includes("admin") || roles.includes("moderator");
  if (!ok) throw new Error("Acesso negado");
  return roles;
}

async function audit(
  context: AdminContext,
  action: string,
  target_type: string | null,
  target_id: string | null,
  payload: Json | null = null,
) {
  await context.supabase.from("audit_log").insert({
    actor_id: context.userId,
    action,
    target_type,
    target_id,
    payload,
  });
}

// ===== Dashboard stats =====
export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    const [profiles, banners, reports, notifications, audit] = await Promise.all([
      sb.from("profiles").select("id, created_at, city, is_verified, is_suspended"),
      sb.from("banners").select("id, is_active"),
      sb.from("reports").select("id, status"),
      sb.from("notifications").select("id"),
      sb
        .from("audit_log")
        .select("id, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const profs = profiles.data ?? [];
    const now = Date.now();
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now - (29 - i) * 86400000);
      const day = d.toISOString().slice(0, 10);
      return { day, count: 0 };
    });
    for (const p of profs) {
      const day = (p.created_at as string).slice(0, 10);
      const slot = last30.find((s) => s.day === day);
      if (slot) slot.count += 1;
    }
    const byCity: Record<string, number> = {};
    for (const p of profs) {
      const c = p.city ?? "—";
      byCity[c] = (byCity[c] ?? 0) + 1;
    }
    return {
      totals: {
        players: profs.length,
        verified: profs.filter((p) => p.is_verified).length,
        suspended: profs.filter((p) => p.is_suspended).length,
        activeBanners: (banners.data ?? []).filter((b) => b.is_active).length,
        pendingReports: (reports.data ?? []).filter((r) => r.status === "pending").length,
        notifications: (notifications.data ?? []).length,
      },
      signupsLast30: last30,
      cityBreakdown: Object.entries(byCity)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      recentAudit: audit.data ?? [],
    };
  });

export const listPendingAdminScoreReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context, true);
    const { data, error } = await untyped(context.supabase)
      .from("challenges")
      .select(
        `id, score_challenger, score_challenged, score_registered_at, score_admin_review_requested_at,
         challenger:teams!challenges_challenger_team_id_fkey(name),
         challenged:teams!challenges_challenged_team_id_fkey(name)`,
      )
      .eq("status", "awaiting_confirmation")
      .not("score_admin_review_requested_at", "is", null)
      .order("score_admin_review_requested_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as PendingAdminScoreReview[];
  });

export const adminConfirmChallengeScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ challengeId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context, true);
    const { error } = await untyped(context.supabase).rpc("confirm_challenge_score", {
      _challenge_id: data.challengeId,
    });
    if (error) throw new Error(error.message);
    await audit(context, "challenge.score.admin_confirm", "challenge", data.challengeId);
    return { ok: true };
  });

// ===== Users =====
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string } | undefined) => d ?? {})
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("profiles")
      .select(
        "id, display_name, username, city, level, avatar_url, is_verified, is_suspended, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.search) {
      q = q.or(
        `display_name.ilike.%${data.search}%,username.ilike.%${data.search}%,city.ilike.%${data.search}%`,
      );
    }
    const { data: profs, error } = await q;
    if (error) throw error;
    const ids = (profs ?? []).map((p) => p.id);
    const rolesByUser: Record<string, string[]> = {};
    if (ids.length) {
      const { data: roles } = await context.supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);
      for (const r of roles ?? []) {
        rolesByUser[r.user_id] = [...(rolesByUser[r.user_id] ?? []), r.role];
      }
    }
    return (profs ?? []).map((p) => ({ ...p, roles: rolesByUser[p.id] ?? [] }));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "admin" | "moderator" | "player"; grant: boolean }) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "moderator", "player"]),
        grant: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context, true);
    if (data.grant) {
      const { error } = await context.supabase
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw error;
    } else {
      const { error } = await context.supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw error;
    }
    await audit(context, data.grant ? "role.grant" : "role.revoke", "user", data.userId, {
      role: data.role,
    });
    return { ok: true };
  });

export const setUserFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; field: "is_verified" | "is_suspended"; value: boolean }) =>
    z
      .object({
        userId: z.string().uuid(),
        field: z.enum(["is_verified", "is_suspended"]),
        value: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const patch =
      data.field === "is_verified" ? { is_verified: data.value } : { is_suspended: data.value };
    const { error } = await context.supabase.from("profiles").update(patch).eq("id", data.userId);
    if (error) throw error;
    await audit(context, `user.${data.field}`, "user", data.userId, { value: data.value });
    return { ok: true };
  });

// ===== Banners =====
export const listBanners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("banners")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

const bannerSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(120),
  body: z.string().max(500).optional().nullable(),
  link_url: z.string().max(500).optional().nullable(),
  image_url: z.string().max(500).optional().nullable(),
  variant: z.enum(["info", "success", "warning", "promo"]).default("info"),
  is_active: z.boolean().default(true),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  audience: z.string().default("all"),
});

export const saveBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bannerSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context, true);
    if (data.id) {
      const { error } = await context.supabase.from("banners").update(data).eq("id", data.id);
      if (error) throw error;
      await audit(context, "banner.update", "banner", data.id, data);
    } else {
      const { data: ins, error } = await context.supabase
        .from("banners")
        .insert({ ...data, created_by: context.userId })
        .select("id")
        .single();
      if (error) throw error;
      await audit(context, "banner.create", "banner", ins.id, data);
    }
    return { ok: true };
  });

export const deleteBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context, true);
    const { error } = await context.supabase.from("banners").delete().eq("id", data.id);
    if (error) throw error;
    await audit(context, "banner.delete", "banner", data.id, null);
    return { ok: true };
  });

// ===== Notifications =====
export const broadcastNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; body?: string; link_url?: string; city?: string }) =>
    z
      .object({
        title: z.string().min(1).max(120),
        body: z.string().max(500).optional(),
        link_url: z.string().max(500).optional(),
        city: z.string().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    let q = context.supabase.from("profiles").select("id");
    if (data.city) q = q.eq("city", data.city);
    const { data: targets, error } = await q;
    if (error) throw error;
    if (!targets?.length) return { ok: true, sent: 0 };
    const rows = targets.map((t) => ({
      user_id: t.id,
      title: data.title,
      body: data.body ?? null,
      link_url: data.link_url ?? null,
      kind: "broadcast",
      created_by: context.userId,
    }));
    const { error: insErr } = await context.supabase.from("notifications").insert(rows);
    if (insErr) throw insErr;
    await audit(context, "notification.broadcast", null, null, {
      count: rows.length,
      city: data.city,
    });
    return { ok: true, sent: rows.length };
  });

// ===== Settings =====
export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("app_settings").select("*").order("key");
    if (error) throw error;
    return data ?? [];
  });

export const updateSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string; value: Json }) =>
    z.object({ key: z.string().min(1).max(80), value: z.any() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context, true);
    const { error } = await context.supabase
      .from("app_settings")
      .update({ value: data.value, updated_by: context.userId })
      .eq("key", data.key);
    if (error) throw error;
    await audit(context, "settings.update", "setting", data.key, data.value);
    return { ok: true };
  });

// ===== Reports =====
export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  });

export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "resolved" | "dismissed" }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["resolved", "dismissed"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("reports")
      .update({
        status: data.status,
        resolved_by: context.userId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw error;
    await audit(context, "report.resolve", "report", data.id, { status: data.status });
    return { ok: true };
  });

// ===== Audit log =====
export const listAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  });

// ===== CSV export =====
function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

export const exportCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      table: "profiles" | "user_roles" | "banners" | "notifications" | "reports" | "audit_log";
    }) =>
      z
        .object({
          table: z.enum([
            "profiles",
            "user_roles",
            "banners",
            "notifications",
            "reports",
            "audit_log",
          ]),
        })
        .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase.from(data.table).select("*").limit(5000);
    if (error) throw error;
    await audit(context, "export.csv", "table", data.table, { rows: rows?.length ?? 0 });
    return { csv: toCsv(rows ?? []), filename: `${data.table}.csv` };
  });

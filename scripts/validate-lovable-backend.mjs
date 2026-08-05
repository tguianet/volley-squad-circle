/**
 * Valida RPCs/tabelas no backend Lovable Cloud (usa VITE_SUPABASE_* do .env local).
 * Uso: node --env-file=.env scripts/validate-lovable-backend.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("❌ VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY não configurados.");
  process.exit(1);
}

const supabase = createClient(url, key);
const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`✅ ${name}`);
  } catch (e) {
    const msg = e?.message ?? String(e);
    results.push({ name, ok: false, error: msg });
    console.log(`❌ ${name}: ${msg}`);
  }
}

const { data: arena } = await supabase
  .from("arenas")
  .select("id")
  .eq("is_active", true)
  .limit(1)
  .maybeSingle();

const arenaId = arena?.id ?? null;

await check("matches.court_number", async () => {
  const { error } = await supabase.from("matches").select("court_number").limit(1);
  if (error) throw error;
});

await check("get_available_sundays", async () => {
  if (!arenaId) throw new Error("nenhuma arena ativa para testar");
  const { error } = await supabase.rpc("get_available_sundays", { p_arena_id: arenaId });
  if (error) throw error;
});

await check("check_court_availability", async () => {
  if (!arenaId) throw new Error("nenhuma arena ativa para testar");
  const { error } = await supabase.rpc("check_court_availability", {
    p_match_date: new Date().toISOString().slice(0, 10),
    p_start_time: "08:00:00",
    p_end_time: "09:00:00",
    p_arena_id: arenaId,
    p_court_number: 1,
  });
  if (error) throw error;
});

await check("can_challenge_by_rank", async () => {
  const { error } = await supabase.rpc("can_challenge_by_rank", {
    my_position: 10,
    opponent_position: 8,
  });
  if (error) throw error;
});

await check("is_team_ranking_complete", async () => {
  const { error } = await supabase.rpc("is_team_ranking_complete", {
    p_category: "dupla",
    p_member_count: 2,
  });
  if (error) throw error;
});


await check("get_team_ranking_details", async () => {
  const { data: team } = await supabase.from("teams").select("id").limit(1).maybeSingle();
  if (!team?.id) throw new Error("nenhum time para testar");
  const { error } = await supabase.rpc("get_team_ranking_details", { p_team_id: team.id });
  if (error) throw error;
});

await check("get_player_ranking_details", async () => {
  const { data: profile } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
  if (!profile?.id) throw new Error("nenhum perfil para testar");
  const { error } = await supabase.rpc("get_player_ranking_details", {
    p_profile_id: profile.id,
  });
  if (error) throw error;
});

await check("list_scheduled_challenges_public", async () => {
  const { error } = await supabase.rpc("list_scheduled_challenges_public");
  if (error) throw error;
});


const failed = results.filter((r) => !r.ok);
console.log("\n---");
console.log(`${results.length - failed.length}/${results.length} checks OK`);
process.exit(failed.length > 0 ? 1 : 0);

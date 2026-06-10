import { createFileRoute } from "@tanstack/react-router";

// Called monthly by pg_cron. Runs penalties for previous month and generates
// availability rows for the current month.
export const Route = createFileRoute("/api/public/hooks/monthly-rollover")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: penalized, error: pErr } = await supabaseAdmin.rpc(
          "apply_previous_month_penalties",
        );
        if (pErr) {
          console.error("[monthly-rollover] penalties error:", pErr.message);
          return new Response(JSON.stringify({ ok: false, step: "penalties", error: pErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: generated, error: gErr } = await supabaseAdmin.rpc(
          "generate_current_month_availability",
        );
        if (gErr) {
          console.error("[monthly-rollover] generate error:", gErr.message);
          return new Response(JSON.stringify({ ok: false, step: "generate", error: gErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ ok: true, penalized, generated, at: new Date().toISOString() }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});

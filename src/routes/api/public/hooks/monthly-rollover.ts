import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Called monthly by pg_cron. Runs penalties for previous month and generates
// availability rows for the current month. Uses the public anon client +
// SECURITY DEFINER RPCs (no service-role key required on Lovable Cloud).
export const Route = createFileRoute("/api/public/hooks/monthly-rollover")({
  server: {
    handlers: {
      POST: async () => {
        const { data: penalized, error: pErr } = await (supabase.rpc as any)(
          "apply_previous_month_penalties",
        );
        if (pErr) {
          console.error("[monthly-rollover] penalties error:", pErr.message);
          return new Response(
            JSON.stringify({ ok: false, step: "penalties", error: pErr.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const { data: generated, error: gErr } = await (supabase.rpc as any)(
          "generate_current_month_availability",
        );
        if (gErr) {
          console.error("[monthly-rollover] generate error:", gErr.message);
          return new Response(
            JSON.stringify({ ok: false, step: "generate", error: gErr.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({ ok: true, penalized, generated, at: new Date().toISOString() }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});

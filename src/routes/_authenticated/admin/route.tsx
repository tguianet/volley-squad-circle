import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin-layout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — BeachPlay Arena" }] }),
  beforeLoad: async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw redirect({ to: "/auth" });
    }

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id);

    if (
      rolesError ||
      !(roles ?? []).some((item) => item.role === "admin" || item.role === "moderator")
    ) {
      throw redirect({ to: "/" });
    }
  },
  component: () => (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  ),
});

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ProfileCompletionModal } from "@/components/profile-completion-modal";
import { isAccountSuspended } from "@/lib/auth-access";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    if (await isAccountSuspended(data.user.id)) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => (
    <>
      <Outlet />
      <ProfileCompletionModal />
    </>
  ),
});

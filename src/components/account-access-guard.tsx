import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isAccountSuspended } from "@/lib/auth-access";

export function AccountAccessGuard() {
  const navigate = useNavigate();
  const checkingUserId = useRef<string | null>(null);

  useEffect(() => {
    const checkAccess = async (userId: string) => {
      if (checkingUserId.current === userId) return;
      checkingUserId.current = userId;

      try {
        if (!(await isAccountSuspended(userId))) return;

        await supabase.auth.signOut();
        toast.error("Sua conta está suspensa. Fale com a administração.");
        navigate({ to: "/auth", replace: true });
      } catch {
        // Uma falha temporária de rede não deve encerrar uma sessão válida.
      } finally {
        checkingUserId.current = null;
      }
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "INITIAL_SESSION" || event === "SIGNED_IN") && session?.user) {
        void checkAccess(session.user.id);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, [navigate]);

  return null;
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, Waves } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/utils";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({ meta: [{ title: "Redefinir senha — BeachPlay Arena" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [checking, setChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const recoveryMarker = new URLSearchParams(window.location.hash.slice(1)).get("type");
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setHasRecoverySession(true);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setHasRecoverySession(Boolean(data.session) && recoveryMarker === "recovery");
      setChecking(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) {
      toast.error("As senhas não são iguais.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Senha alterada. Agora você já pode entrar.");
      navigate({ to: "/auth" });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Não foi possível alterar a senha"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 gradient-ocean">
      <Card className="w-full max-w-md p-8 shadow-card">
        <div className="flex items-center gap-2 mb-6">
          <div className="size-10 rounded-xl gradient-beach flex items-center justify-center">
            <Waves className="size-5 text-white" />
          </div>
          <span className="font-display text-xl">BeachPlay Arena</span>
        </div>
        <h1 className="text-3xl">Criar nova senha</h1>

        {checking ? (
          <Loader2 className="size-6 animate-spin mt-8 mx-auto" />
        ) : !hasRecoverySession ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Este link expirou ou já foi usado. Solicite outro link na tela de entrada.
            </p>
            <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>
              Voltar para entrar
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Nova senha</label>
              <div className="relative">
                <Lock className="size-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  required
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-9 h-11"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Confirmar nova senha</label>
              <Input
                required
                minLength={8}
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="h-11"
              />
            </div>
            <Button disabled={loading} className="w-full h-11 gradient-beach text-white border-0">
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Salvar nova senha"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

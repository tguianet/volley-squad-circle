import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Waves, Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { isAccountSuspended } from "@/lib/auth-access";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — BeachPlay Arena" }] }),
  component: Auth,
});

function Auth() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      if (await isAccountSuspended(data.user.id)) {
        await supabase.auth.signOut();
        toast.error("Sua conta está suspensa. Fale com a administração.");
        return;
      }
      navigate({ to: "/" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        });
        if (error) throw error;
        toast.success(
          "Se o e-mail estiver cadastrado, você receberá o link para criar outra senha.",
        );
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Conta criada. Confira seu e-mail para confirmar o cadastro.");
          setMode("login");
          return;
        }
        toast.success("Conta criada! Bem-vindo à areia.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (await isAccountSuspended(data.user.id)) {
          await supabase.auth.signOut();
          toast.error("Sua conta está suspensa. Fale com a administração.");
          return;
        }
        toast.success("Bem-vindo de volta!");
      }
      navigate({ to: "/" });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Falha na autenticação"));
    } finally {
      setLoading(false);
    }
  };

  const signInGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Falha no login com Google");
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/" });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-svh grid md:grid-cols-2">
      <div className="hidden md:flex relative overflow-hidden gradient-ocean p-12 flex-col justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Waves className="size-6" />
          </div>
          <div>
            <div className="font-display text-2xl leading-none">BeachPlay</div>
            <div className="text-xs tracking-widest opacity-80">ARENA</div>
          </div>
        </div>
        <div>
          <h1 className="text-5xl font-display leading-tight">
            A rede social
            <br />
            do vôlei de areia.
          </h1>
          <p className="mt-4 text-white/80 max-w-sm">
            Conecte-se com jogadores, arenas e torneios. Marque partidas, suba no ranking, viva a
            praia.
          </p>
        </div>
        <div className="text-xs text-white/70">© BeachPlay Arena 2026</div>
        <div className="absolute -bottom-20 -right-20 size-80 rounded-full bg-accent/40 blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md p-5 shadow-card sm:p-8">
          <div className="md:hidden flex items-center gap-2 mb-6">
            <div className="size-10 rounded-xl gradient-beach flex items-center justify-center">
              <Waves className="size-5 text-white" />
            </div>
            <span className="font-display text-xl">BeachPlay Arena</span>
          </div>
          <h2 className="text-3xl">
            {mode === "login"
              ? "Bem-vindo de volta"
              : mode === "signup"
                ? "Crie sua conta"
                : "Recuperar senha"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login"
              ? "Entra na areia."
              : mode === "signup"
                ? "Comece sua jornada na areia."
                : "Enviaremos um link seguro para o seu e-mail."}
          </p>

          {mode !== "forgot" && (
            <Button
              type="button"
              onClick={signInGoogle}
              disabled={googleLoading}
              variant="outline"
              className="mt-6 w-full h-11 gap-2"
            >
              {googleLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="size-4">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.96l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                  />
                </svg>
              )}
              Continuar com Google
            </Button>
          )}

          {mode !== "forgot" && (
            <div className="flex items-center gap-3 my-5">
              <div className="h-px bg-border flex-1" />
              <span className="text-xs text-muted-foreground">ou com e-mail</span>
              <div className="h-px bg-border flex-1" />
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Nome</label>
                <div className="relative">
                  <UserIcon className="size-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Bruno Schmidt"
                    className="pl-9 h-11"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">E-mail</label>
              <div className="relative">
                <Mail className="size-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@beachplay.com"
                  className="pl-9 h-11"
                />
              </div>
            </div>
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Senha</label>
                <div className="relative">
                  <Lock className="size-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    required
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 h-11"
                  />
                </div>
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 gradient-beach text-white border-0 shadow-glow text-base"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === "login" ? (
                "Entrar"
              ) : mode === "forgot" ? (
                "Enviar link"
              ) : (
                "Criar conta"
              )}
            </Button>
          </form>

          {mode === "login" && (
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="mt-4 text-sm text-primary font-semibold w-full text-center hover:underline"
            >
              Esqueci minha senha
            </button>
          )}

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-6 text-sm text-muted-foreground w-full text-center hover:text-foreground"
          >
            {mode === "login" ? "Não tem conta? " : mode === "signup" ? "Já tem conta? " : ""}
            <span className="text-primary font-semibold">
              {mode === "login"
                ? "Cadastre-se"
                : mode === "signup"
                  ? "Entrar"
                  : "Voltar para entrar"}
            </span>
          </button>
          <Link
            to="/"
            className="block mt-3 text-xs text-center text-muted-foreground hover:text-foreground"
          >
            Continuar sem login →
          </Link>
        </Card>
      </div>
    </div>
  );
}

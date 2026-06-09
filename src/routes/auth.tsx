import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Waves, Mail, Lock, User as UserIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — BeachPlay Arena" }] }),
  component: Auth,
});

function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const navigate = useNavigate();
  return (
    <div className="min-h-screen grid md:grid-cols-2">
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
          <h1 className="text-5xl font-display leading-tight">A rede social<br/>do vôlei de areia.</h1>
          <p className="mt-4 text-white/80 max-w-sm">Conecte-se com jogadores, arenas e torneios. Marque partidas, suba no ranking, viva a praia.</p>
        </div>
        <div className="text-xs text-white/70">© BeachPlay Arena 2026</div>
        <div className="absolute -bottom-20 -right-20 size-80 rounded-full bg-accent/40 blur-3xl"/>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 shadow-card">
          <div className="md:hidden flex items-center gap-2 mb-6">
            <div className="size-10 rounded-xl gradient-beach flex items-center justify-center">
              <Waves className="size-5 text-white" />
            </div>
            <span className="font-display text-xl">BeachPlay Arena</span>
          </div>
          <h2 className="text-3xl">{mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}</h2>
          <p className="text-sm text-muted-foreground mt-1">{mode === "login" ? "Entra na areia." : "Comece sua jornada na areia."}</p>

          <form onSubmit={(e) => { e.preventDefault(); navigate({ to: "/" }); }} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Nome</label>
                <div className="relative">
                  <UserIcon className="size-4 absolute left-3 top-3 text-muted-foreground"/>
                  <Input placeholder="Bruno Schmidt" className="pl-9 h-11"/>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">E-mail</label>
              <div className="relative">
                <Mail className="size-4 absolute left-3 top-3 text-muted-foreground"/>
                <Input type="email" placeholder="voce@beachplay.com" className="pl-9 h-11"/>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Senha</label>
              <div className="relative">
                <Lock className="size-4 absolute left-3 top-3 text-muted-foreground"/>
                <Input type="password" placeholder="••••••••" className="pl-9 h-11"/>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 gradient-beach text-white border-0 shadow-glow text-base">
              {mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-6 text-sm text-muted-foreground w-full text-center hover:text-foreground"
          >
            {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
            <span className="text-primary font-semibold">{mode === "login" ? "Cadastre-se" : "Entrar"}</span>
          </button>
          <Link to="/" className="block mt-3 text-xs text-center text-muted-foreground hover:text-foreground">Continuar sem login →</Link>
        </Card>
      </div>
    </div>
  );
}

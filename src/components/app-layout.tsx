import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Calendar, Trophy, Medal, User, Bell, Swords, MapPin, Waves } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Feed", icon: Home },
  { to: "/partidas", label: "Partidas", icon: Calendar },
  { to: "/ranking", label: "Ranking", icon: Medal },
  { to: "/torneios", label: "Torneios", icon: Trophy },
  { to: "/perfil", label: "Perfil", icon: User },
];

const sideExtra = [
  { to: "/h2h", label: "H2H", icon: Swords },
  { to: "/arenas", label: "Arenas", icon: MapPin },
  { to: "/notificacoes", label: "Notificações", icon: Bell },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex w-full">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card/60 backdrop-blur sticky top-0 h-screen p-6 gap-2">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="size-10 rounded-xl gradient-beach flex items-center justify-center shadow-glow">
            <Waves className="size-5 text-white" />
          </div>
          <div>
            <div className="font-display text-xl leading-none">BeachPlay</div>
            <div className="text-xs text-muted-foreground tracking-widest">ARENA</div>
          </div>
        </Link>
        <nav className="flex flex-col gap-1">
          {[...navItems, ...sideExtra].map((it) => {
            const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active ? "gradient-beach text-white shadow-glow" : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                )}
              >
                <it.icon className="size-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-4 rounded-2xl gradient-sand text-sm">
          <div className="font-display text-lg leading-none">Pronto pra jogar?</div>
          <p className="text-xs text-muted-foreground mt-1">Crie ou entre numa partida aberta agora.</p>
          <Link to="/partidas/nova" className="mt-3 inline-flex items-center justify-center w-full rounded-lg bg-accent text-accent-foreground px-3 py-2 text-xs font-semibold shadow-glow">
            Criar partida amistosa
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b bg-card/80 backdrop-blur">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg gradient-beach flex items-center justify-center">
              <Waves className="size-4 text-white" />
            </div>
            <span className="font-display text-lg">BeachPlay</span>
          </Link>
          <Link to="/notificacoes" className="size-9 rounded-full bg-secondary flex items-center justify-center">
            <Bell className="size-4" />
          </Link>
        </header>

        <main className="flex-1 pb-24 md:pb-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur">
          <div className="grid grid-cols-5">
            {navItems.map((it) => {
              const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
              return (
                <Link key={it.to} to={it.to} className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium">
                  <div className={cn("size-9 rounded-xl flex items-center justify-center transition-all",
                    active ? "gradient-beach text-white shadow-glow scale-110" : "text-muted-foreground")}>
                    <it.icon className="size-5" />
                  </div>
                  <span className={active ? "text-foreground" : "text-muted-foreground"}>{it.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

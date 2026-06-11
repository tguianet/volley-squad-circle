import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Calendar, Trophy, Medal, User, Bell, Swords, MapPin, Shield, CalendarDays, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useIsStaff } from "@/hooks/use-auth";
import logoAsset from "@/assets/logo.png.asset.json";

const navItems = [
  { to: "/perfil", label: "Perfil", icon: User },
  { to: "/", label: "Feed", icon: Home },
  { to: "/ranking", label: "Ranking", icon: Medal },
  { to: "/desafios", label: "Desafios", icon: Swords },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/partidas", label: "Partidas amistosas", icon: Calendar },
  { to: "/torneios", label: "Torneios", icon: Trophy },
];

const sideExtra = [
  { to: "/h2h", label: "H2H", icon: Swords },
  { to: "/regras", label: "Regras do Ranking", icon: MapPin },
  { to: "/notificacoes", label: "Notificações", icon: Bell },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isStaff = useIsStaff();
  const extra = isStaff
    ? [...sideExtra, { to: "/admin", label: "Admin", icon: Shield }]
    : sideExtra;

  return (
    <div className="min-h-screen flex w-full">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card/60 backdrop-blur sticky top-0 h-screen p-6 gap-2">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="size-10 rounded-xl overflow-hidden flex items-center justify-center shadow-glow bg-card">
            <img src={logoAsset.url} alt="PlayBeach Arena" className="size-full object-contain" />
          </div>
          <div>
            <div className="font-display text-xl leading-none">PlayBeach</div>
            <div className="text-xs text-muted-foreground tracking-widest">RANKING</div>
          </div>
        </Link>
        <nav className="flex flex-col gap-1">
          {[...navItems, ...extra].map((it) => {
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
            <div className="size-8 rounded-lg overflow-hidden flex items-center justify-center bg-card">
              <img src={logoAsset.url} alt="PlayBeach Arena" className="size-full object-contain" />
            </div>
            <span className="font-display text-lg">PlayBeach</span>
          </Link>
          <Link to="/notificacoes" className="size-9 rounded-full bg-secondary flex items-center justify-center">
            <Bell className="size-4" />
          </Link>
        </header>

        <main className="flex-1 pb-24 md:pb-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur">
          <div className="grid grid-cols-7">
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

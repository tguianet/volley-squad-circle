import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Calendar,
  Trophy,
  Medal,
  User,
  Bell,
  Swords,
  MapPin,
  Shield,
  CalendarDays,
  LogOut,
  Waves,
  Menu,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useIsStaff } from "@/hooks/use-auth";
import { ChallengeInviteHost } from "@/components/challenges/challenge-invite-host";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

async function fetchUnreadNotificationCount() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}

const navItems = [
  { to: "/perfil", label: "Perfil", icon: User },
  { to: "/", label: "Feed", icon: Home },
  { to: "/ranking", label: "Ranking", icon: Medal },
  { to: "/desafios", label: "Desafios", icon: Swords },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/partidas/nova", label: "Partidas amistosas", icon: Calendar },
  { to: "/torneios", label: "Torneios", icon: Trophy },
];

const sideExtra = [
  { to: "/h2h", label: "H2H", icon: Swords },
  { to: "/regras", label: "Regras do Ranking", icon: MapPin },
  { to: "/notificacoes", label: "Notificações", icon: Bell },
];

const mobileNavItems = navItems.slice(0, 4);
const mobileMoreItems = navItems.slice(4);

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const isStaff = useIsStaff();
  const unreadNotifications = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: fetchUnreadNotificationCount,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const extra = isStaff
    ? [...sideExtra, { to: "/admin", label: "Admin", icon: Shield }]
    : sideExtra;
  const mobileMoreActive = [...mobileMoreItems, ...extra].some((item) =>
    pathname.startsWith(item.to),
  );

  return (
    <ChallengeInviteHost>
      <div className="min-h-svh flex w-full">
        <a
          href="#conteudo-principal"
          className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-lg transition-transform focus:translate-y-0"
        >
          Pular para o conteúdo
        </a>
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-[260px] border-r border-border/70 bg-card sticky top-0 h-screen p-4 gap-1">
          <Link
            to="/"
            className="flex items-center gap-3 mb-5 px-2 py-3 rounded-2xl gradient-sand border border-border/40"
          >
            <div className="size-10 rounded-xl flex items-center justify-center gradient-beach shadow-glow">
              <Waves className="size-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <div className="font-display text-xl leading-none tracking-wide">PlayBeach</div>
              <div className="text-[9px] text-muted-foreground tracking-[0.18em] uppercase mt-0.5">
                Rio Preto
              </div>
            </div>
          </Link>
          <nav className="flex flex-col gap-0.5 flex-1">
            {[...navItems, ...extra].map((it) => {
              const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border-l-[3px]",
                    active
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-transparent text-foreground/70 hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <it.icon className="size-4" />
                  {it.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-3">
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="size-4" />
              Sair
            </button>
            <div className="mt-2 flex justify-center gap-3 text-[11px] text-muted-foreground">
              <Link to="/termos" className="hover:text-foreground hover:underline">
                Termos
              </Link>
              <Link to="/privacidade" className="hover:text-foreground hover:underline">
                Privacidade
              </Link>
            </div>
          </div>
          <div className="mt-auto p-4 rounded-2xl border border-accent/30 bg-accent/5 text-sm">
            <div className="font-display text-lg leading-none tracking-wide text-accent">
              Pronto pra jogar?
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Crie ou entre numa partida aberta agora.
            </p>
            <Link
              to="/partidas/nova"
              className="mt-3 inline-flex items-center justify-center w-full rounded-xl gradient-beach text-white px-3 py-2.5 text-xs font-bold shadow-glow hover:brightness-105 transition"
            >
              Criar partida amistosa
            </Link>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile topbar */}
          <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] border-b border-border/60 bg-card/90 backdrop-blur-md">
            <Link to="/" className="flex items-center gap-2">
              <div className="size-8 rounded-lg overflow-hidden flex items-center justify-center bg-card">
                <Waves className="size-5 text-primary" aria-hidden="true" />
              </div>
              <span className="font-display text-lg">PlayBeach</span>
            </Link>
            <Link
              to="/notificacoes"
              className="relative size-9 rounded-full bg-secondary flex items-center justify-center"
              aria-label={`${unreadNotifications.data ?? 0} notificações não lidas`}
            >
              <Bell className="size-4" />
              {(unreadNotifications.data ?? 0) > 0 && (
                <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {(unreadNotifications.data ?? 0) > 99 ? "99+" : unreadNotifications.data}
                </span>
              )}
            </Link>
          </header>

          <main
            id="conteudo-principal"
            tabIndex={-1}
            className="flex-1 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-8 focus:outline-none"
          >
            {children}
          </main>

          {/* Mobile bottom nav */}
          <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-card/95 backdrop-blur-md pb-safe">
            <div className="grid grid-cols-5">
              {mobileNavItems.map((it) => {
                const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    aria-current={active ? "page" : undefined}
                    className="flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium"
                  >
                    <div
                      className={cn(
                        "size-9 rounded-xl flex items-center justify-center transition-all",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm scale-105"
                          : "text-muted-foreground",
                      )}
                    >
                      <it.icon className="size-5" />
                    </div>
                    <span
                      className={cn(
                        "max-w-full truncate",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {it.label}
                    </span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium",
                  mobileMoreActive ? "text-foreground" : "text-muted-foreground",
                )}
                aria-label="Abrir mais opções"
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl",
                    mobileMoreActive && "bg-primary text-primary-foreground shadow-sm scale-105",
                  )}
                >
                  <Menu className="size-5" />
                </span>
                <span>Mais</span>
              </button>
            </div>
          </nav>

          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetContent
              side="bottom"
              className="max-h-[85dvh] overflow-y-auto rounded-t-3xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            >
              <SheetHeader className="text-left">
                <SheetTitle>Mais opções</SheetTitle>
                <SheetDescription>Acesse as outras áreas do PlayBeach.</SheetDescription>
              </SheetHeader>
              <nav className="mt-5 grid grid-cols-2 gap-3">
                {[...mobileMoreItems, ...extra].map((it) => {
                  const active = pathname.startsWith(it.to);
                  return (
                    <SheetClose asChild key={it.to}>
                      <Link
                        to={it.to}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-14 items-center gap-3 rounded-2xl border p-3 text-sm font-semibold",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 bg-card text-foreground",
                        )}
                      >
                        <it.icon className="size-5 shrink-0" />
                        <span>{it.label}</span>
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>
              <button
                type="button"
                onClick={async () => {
                  setMoreOpen(false);
                  await supabase.auth.signOut();
                  navigate({ to: "/auth" });
                }}
                className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 text-sm font-semibold text-destructive"
              >
                <LogOut className="size-4" />
                Sair da conta
              </button>
              <div className="mt-4 flex justify-center gap-5 text-xs text-muted-foreground">
                <SheetClose asChild>
                  <Link to="/termos" className="min-h-11 content-center hover:underline">
                    Termos de Uso
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/privacidade" className="min-h-11 content-center hover:underline">
                    Privacidade
                  </Link>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </ChallengeInviteHost>
  );
}

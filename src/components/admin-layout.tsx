import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Settings,
  ShieldAlert,
  Bell,
  ClipboardList,
  Download,
  Waves,
  ArrowLeft,
  LogOut,
  Loader2,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useIsStaff, useMyRoles } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/banners", label: "Banners", icon: Megaphone },
  { to: "/admin/notificacoes", label: "Notificações", icon: Bell },
  { to: "/admin/reports", label: "Denúncias", icon: ShieldAlert },
  { to: "/admin/auditoria", label: "Auditoria", icon: ClipboardList },
  { to: "/admin/relatorios", label: "Relatórios", icon: Download },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: roles, isLoading } = useMyRoles();
  const isStaff = useIsStaff();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
        <div className="max-w-md text-center space-y-4">
          <ShieldAlert className="size-12 mx-auto text-amber-400" />
          <h1 className="text-2xl font-semibold">Acesso restrito</h1>
          <p className="text-sm text-white/70">
            Esta área é apenas para administradores e moderadores do BeachPlay Arena. Peça para um
            admin existente promover sua conta em <code>user_roles</code>.
          </p>
          <Button onClick={() => navigate({ to: "/" })} variant="secondary">
            <ArrowLeft className="size-4 mr-1" /> Voltar ao app
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-slate-950 text-slate-100">
      <aside className="hidden md:flex flex-col w-64 border-r border-white/10 bg-slate-900/60 backdrop-blur sticky top-0 h-screen p-5 gap-1">
        <Link to="/admin" className="flex items-center gap-2 mb-6 px-2">
          <div className="size-9 rounded-lg gradient-beach flex items-center justify-center shadow-glow">
            <Waves className="size-4 text-white" />
          </div>
          <div>
            <div className="font-display text-lg leading-none">BeachPlay</div>
            <div className="text-[10px] tracking-widest text-amber-400">ADMIN</div>
          </div>
        </Link>
        <nav className="flex flex-col gap-0.5">
          {items.map((it) => {
            const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                <it.icon className="size-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-white/40 px-2">Suas roles</div>
          <div className="px-2 flex flex-wrap gap-1">
            {(roles ?? []).map((r) => (
              <span key={r} className="text-[10px] bg-white/10 rounded px-1.5 py-0.5">
                {r}
              </span>
            ))}
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/60 hover:bg-white/5"
          >
            <ArrowLeft className="size-3.5" /> Voltar ao app
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/60 hover:bg-white/5 w-full"
          >
            <LogOut className="size-3.5" /> Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-white/10 bg-slate-900/80 backdrop-blur">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="size-7 rounded-lg gradient-beach flex items-center justify-center">
              <Waves className="size-3.5 text-white" />
            </div>
            <span className="font-display text-base">Admin</span>
          </Link>
          <button onClick={handleSignOut} className="text-xs text-white/60">
            Sair
          </button>
        </header>
        <main className="flex-1 p-4 md:p-8 pb-20">{children}</main>
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-slate-900/95 backdrop-blur overflow-x-auto">
          <div className="flex">
            {items.map((it) => {
              const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 px-3 text-[10px] min-w-[64px]",
                    active ? "text-white" : "text-white/50",
                  )}
                >
                  <it.icon className="size-4" />
                  {it.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

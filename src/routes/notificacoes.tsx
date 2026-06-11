import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Bell, Trophy, Users, Heart, Calendar, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/notificacoes")({
  head: () => ({ meta: [{ title: "Notificações — PlayBeach" }] }),
  component: NotifPage,
});

type NotifRow = {
  id: string;
  title: string;
  body: string | null;
  kind: string | null;
  is_read: boolean;
  created_at: string;
};

const iconMap: Record<string, any> = {
  trophy: Trophy, users: Users, heart: Heart, calendar: Calendar, message: MessageCircle,
  challenge: Trophy, team: Users, like: Heart, comment: MessageCircle,
};

async function fetchNotifs(): Promise<NotifRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, kind, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as NotifRow[];
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

function NotifPage() {
  const q = useQuery({ queryKey: ["notifications"], queryFn: fetchNotifs });
  const items = q.data ?? [];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="size-6 text-primary"/>
          <h1 className="text-3xl">Notificações</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Tudo que rolou na sua areia.</p>

        {q.isLoading && <Card className="p-6 text-center text-sm text-muted-foreground">Carregando…</Card>}
        {!q.isLoading && items.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">Nenhuma notificação por enquanto.</Card>
        )}
        {items.length > 0 && (
          <Card className="shadow-card divide-y">
            {items.map(n => {
              const Icon = iconMap[n.kind ?? ""] ?? Bell;
              return (
                <div key={n.id} className={`p-4 flex items-center gap-3 ${n.is_read ? "" : "bg-primary/5"}`}>
                  <div className="size-10 rounded-full gradient-beach text-white flex items-center justify-center shrink-0">
                    <Icon className="size-4"/>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                    <div className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

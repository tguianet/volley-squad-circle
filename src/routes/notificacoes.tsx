import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Trophy, Users, Heart, Calendar, MessageCircle, Check, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

type PendingInvite = {
  id: string;
  team_id: string;
  created_at: string;
  team: { name: string } | null;
  inviter: { display_name: string | null; username: string | null } | null;
};

const iconMap: Record<string, any> = {
  trophy: Trophy, users: Users, heart: Heart, calendar: Calendar, message: MessageCircle,
  challenge: Trophy, team: Users, like: Heart, comment: MessageCircle, team_invite: Users,
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

async function fetchPendingInvites(): Promise<PendingInvite[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("team_invitations")
    .select("id, team_id, inviter_id, created_at, team:teams(name)")
    .eq("invitee_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as any[];
  const inviterIds = Array.from(new Set(rows.map(r => r.inviter_id)));
  let profilesMap: Record<string, { display_name: string | null; username: string | null }> = {};
  if (inviterIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", inviterIds);
    profilesMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
  }
  return rows.map(r => ({
    id: r.id,
    team_id: r.team_id,
    created_at: r.created_at,
    team: r.team,
    inviter: profilesMap[r.inviter_id] ?? null,
  }));
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
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications"], queryFn: fetchNotifs });
  const invitesQ = useQuery({ queryKey: ["pending-invites"], queryFn: fetchPendingInvites });
  const items = q.data ?? [];
  const invites = invitesQ.data ?? [];

  const respond = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "declined" }) => {
      const { error } = await supabase.from("team_invitations").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.status === "accepted" ? "Convite aceito!" : "Convite recusado");
      qc.invalidateQueries({ queryKey: ["pending-invites"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["my-captain-teams"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao responder"),
  });

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="size-6 text-primary"/>
          <h1 className="text-3xl">Notificações</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Tudo que rolou na sua areia.</p>

        {invites.length > 0 && (
          <div className="space-y-3 mb-4">
            {invites.map(inv => {
              const who = inv.inviter?.display_name ?? inv.inviter?.username ?? "Alguém";
              const team = inv.team?.name ?? "um time";
              const loading = respond.isPending;
              return (
                <Card key={inv.id} className="p-4 flex items-center gap-3 bg-primary/5">
                  <div className="size-10 rounded-full gradient-beach text-white flex items-center justify-center shrink-0">
                    <Users className="size-4"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">Convite para time</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {who} convidou você para o time "{team}"
                    </div>
                    <div className="text-xs text-muted-foreground">{timeAgo(inv.created_at)}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" disabled={loading}
                      onClick={() => respond.mutate({ id: inv.id, status: "accepted" })}>
                      <Check className="size-4 mr-1"/> Aceitar
                    </Button>
                    <Button size="sm" variant="outline" disabled={loading}
                      onClick={() => respond.mutate({ id: inv.id, status: "declined" })}>
                      <X className="size-4 mr-1"/> Recusar
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {q.isLoading && <Card className="p-6 text-center text-sm text-muted-foreground">Carregando…</Card>}
        {!q.isLoading && items.length === 0 && invites.length === 0 && (
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

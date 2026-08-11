import { untyped } from "@/lib/supabase-untyped";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Trophy,
  Users,
  Heart,
  Calendar,
  MessageCircle,
  Check,
  X,
  Link as LinkIcon,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { isSafeNotificationLink } from "@/lib/notification-link";
import { respondToProfileLinkRequest, listPendingLinkRequests } from "@/lib/ranking.functions";
import { AsyncQueryState } from "@/components/ui/async-query-state";
import type { LucideIcon } from "lucide-react";

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
  link_url: string | null;
};

type PendingInvite = {
  id: string;
  team_id: string;
  created_at: string;
  team: { name: string } | null;
  inviter: { display_name: string | null; username: string | null } | null;
};

type PendingProfileLink = {
  id: string;
  requester_id: string;
  created_at: string;
  requester: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

const iconMap: Record<string, LucideIcon> = {
  trophy: Trophy,
  users: Users,
  heart: Heart,
  calendar: Calendar,
  message: MessageCircle,
  challenge: Trophy,
  team: Users,
  like: Heart,
  comment: MessageCircle,
  team_invite: Users,
};

async function fetchNotifs(): Promise<NotifRow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, kind, is_read, created_at, link_url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as NotifRow[];
}

async function fetchPendingInvites(): Promise<PendingInvite[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("team_invitations")
    .select("id, team_id, inviter_id, created_at, team:teams(name)")
    .eq("invitee_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as {
    id: string;
    team_id: string;
    inviter_id: string;
    created_at: string;
    team: { name: string } | null;
  }[];
  const inviterIds = Array.from(new Set(rows.map((r) => r.inviter_id)));
  let profilesMap: Record<string, { display_name: string | null; username: string | null }> = {};
  if (inviterIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", inviterIds);
    profilesMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
  }
  return rows.map((r) => ({
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
  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifs,
    refetchInterval: 30_000,
  });
  const invitesQ = useQuery({ queryKey: ["pending-invites"], queryFn: fetchPendingInvites });
  const items = q.data ?? [];
  const invites = invitesQ.data ?? [];

  const fetchPendingProfileLinks = useServerFn(listPendingLinkRequests);
  const respondToProfileLink = useServerFn(respondToProfileLinkRequest);

  const profileLinksQ = useQuery({
    queryKey: ["pending-profile-links"],
    queryFn: () => fetchPendingProfileLinks(),
  });
  const profileLinks = (profileLinksQ.data ?? []) as unknown as PendingProfileLink[];

  const respond = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "declined" }) => {
      const { error } = await untyped().rpc("respond_to_team_invitation", {
        p_invitation_id: id,
        p_status: status,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.status === "accepted" ? "Convite aceito!" : "Convite recusado");
      qc.invalidateQueries({ queryKey: ["pending-invites"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["my-captain-teams"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Erro ao responder")),
  });

  const respondToLink = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "declined" }) => {
      await respondToProfileLink({ data: { linkId: id, status } });
    },
    onSuccess: (_d, v) => {
      toast.success(v.status === "accepted" ? "Vínculo aceito!" : "Vínculo recusado");
      qc.invalidateQueries({ queryKey: ["pending-profile-links"] });
      qc.invalidateQueries({ queryKey: ["my-profile-links"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Erro ao responder")),
  });

  const openNotification = useMutation({
    mutationFn: async (notification: NotifRow) => {
      if (!notification.is_read) {
        const { error } = await untyped().rpc("mark_notification_read", {
          p_notification_id: notification.id,
        });
        if (error) throw error;
      }
      return notification.link_url;
    },
    onSuccess: (linkUrl) => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      if (linkUrl && isSafeNotificationLink(linkUrl)) {
        window.location.assign(linkUrl);
      } else if (linkUrl) {
        toast.error("Link da notificação inválido.");
      }
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Erro ao abrir notificação")),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await untyped().rpc("mark_all_notifications_read");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Erro ao marcar notificações")),
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await untyped().rpc("delete_own_notification", {
        p_notification_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notificação excluída");
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Erro ao excluir notificação")),
  });

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="size-6 text-primary" />
          <h1 className="text-3xl">Notificações</h1>
        </div>
        <div className="flex items-center justify-between gap-3 mb-6">
          <p className="text-sm text-muted-foreground">Tudo que rolou na sua areia.</p>
          {items.some((item) => !item.is_read) ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              <Check className="size-4 mr-1" /> Marcar todas como lidas
            </Button>
          ) : null}
        </div>

        {invites.length > 0 && (
          <div className="space-y-3 mb-4">
            {invites.map((inv) => {
              const who = inv.inviter?.display_name ?? inv.inviter?.username ?? "Alguém";
              const team = inv.team?.name ?? "um time";
              const loading = respond.isPending;
              return (
                <Card key={inv.id} className="p-4 flex items-center gap-3 bg-primary/5">
                  <div className="size-10 rounded-full gradient-beach text-white flex items-center justify-center shrink-0">
                    <Users className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">Convite para time</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {who} convidou você para o time "{team}"
                    </div>
                    <div className="text-xs text-muted-foreground">{timeAgo(inv.created_at)}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      disabled={loading}
                      onClick={() => respond.mutate({ id: inv.id, status: "accepted" })}
                    >
                      <Check className="size-4 mr-1" /> Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loading}
                      onClick={() => respond.mutate({ id: inv.id, status: "declined" })}
                    >
                      <X className="size-4 mr-1" /> Recusar
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {profileLinks.length > 0 && (
          <div className="space-y-3 mb-4">
            {profileLinks.map((link) => {
              const who = link.requester?.display_name ?? link.requester?.username ?? "Alguém";
              const loading = respondToLink.isPending;
              return (
                <Card key={link.id} className="p-4 flex items-center gap-3 bg-primary/5">
                  <div className="size-10 rounded-full gradient-beach text-white flex items-center justify-center shrink-0">
                    <LinkIcon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">Solicitação de vínculo de perfil</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {who} quer vincular o perfil ao seu
                    </div>
                    <div className="text-xs text-muted-foreground">{timeAgo(link.created_at)}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      disabled={loading}
                      onClick={() => respondToLink.mutate({ id: link.id, status: "accepted" })}
                    >
                      <Check className="size-4 mr-1" /> Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loading}
                      onClick={() => respondToLink.mutate({ id: link.id, status: "declined" })}
                    >
                      <X className="size-4 mr-1" /> Recusar
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {q.isError ? (
          <Card className="p-6 mb-4">
            <AsyncQueryState
              isLoading={false}
              isError
              isEmpty={false}
              emptyLabel=""
              errorLabel="Não foi possível carregar as notificações."
              onRetry={() => q.refetch()}
              devContext="Notificações"
              devError={q.error}
            >
              {null}
            </AsyncQueryState>
          </Card>
        ) : null}

        {!q.isError && q.isLoading ? (
          <Card className="p-6 text-center text-sm text-muted-foreground mb-4">Carregando…</Card>
        ) : null}

        {!q.isError &&
        !q.isLoading &&
        items.length === 0 &&
        invites.length === 0 &&
        profileLinks.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma notificação por enquanto.
          </Card>
        ) : null}
        {!q.isError && items.length > 0 ? (
          <Card className="shadow-card divide-y">
            {items.map((n) => {
              const Icon = iconMap[n.kind ?? ""] ?? Bell;
              const hasSafeLink = Boolean(n.link_url && isSafeNotificationLink(n.link_url));
              return (
                <div
                  key={n.id}
                  className={`p-4 flex items-center gap-3 ${n.is_read ? "" : "bg-primary/5"} ${hasSafeLink ? "cursor-pointer hover:bg-secondary/50" : ""}`}
                  role={hasSafeLink ? "button" : undefined}
                  tabIndex={hasSafeLink ? 0 : undefined}
                  onClick={() => {
                    if (hasSafeLink) openNotification.mutate(n);
                  }}
                  onKeyDown={(event) => {
                    if (hasSafeLink && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      openNotification.mutate(n);
                    }
                  }}
                >
                  <div className="size-10 rounded-full gradient-beach text-white flex items-center justify-center shrink-0">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                    <div className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={deleteNotification.isPending}
                    aria-label="Excluir notificação"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteNotification.mutate(n.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
          </Card>
        ) : null}
      </div>
    </AppLayout>
  );
}

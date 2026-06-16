import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listPublicProfileFollowers, listPublicProfileFollows } from "@/lib/ranking.functions";
import type { PublicProfileConnection } from "@/lib/profile-follow.types";
import { profileRoute } from "@/lib/profile-follow.utils";
import { useAvatarUrl } from "@/components/avatar-thumb";
import { Loader2, UserCheck, Users } from "lucide-react";

type ConnectionCardProps = {
  connection: PublicProfileConnection;
};

function SocialConnectionCard({ connection }: ConnectionCardProps) {
  const { data: url } = useAvatarUrl(connection.avatar_url);
  const initial = (connection.display_name[0] ?? "?").toUpperCase();
  const handle = connection.apelido ?? connection.username ?? "";

  return (
    <Card className="overflow-hidden border border-border/70 shadow-card hover:shadow-md transition-shadow p-0 gap-0">
      <Link {...profileRoute(connection)} className="block">
        <div className="aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-primary/15 to-secondary/40">
          {url ? (
            <img src={url} alt={connection.display_name} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <span className="font-display text-4xl text-primary/30">{initial}</span>
            </div>
          )}
        </div>
        <div className="p-3 space-y-1">
          <h4 className="font-semibold text-sm truncate">{connection.display_name}</h4>
          {handle ? (
            <p className="text-xs text-muted-foreground truncate">@{handle.replace(/^@/, "")}</p>
          ) : null}
          {connection.category ? (
            <Badge variant="secondary" className="text-[10px] mt-1">
              {connection.category}
            </Badge>
          ) : null}
        </div>
      </Link>
    </Card>
  );
}

function ConnectionSection({
  title,
  icon: Icon,
  connections,
  isLoading,
  emptyText,
}: {
  title: string;
  icon: typeof Users;
  connections: PublicProfileConnection[];
  isLoading: boolean;
  emptyText: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
        {connections.length > 0 ? (
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {connections.length}
          </Badge>
        ) : null}
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : connections.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {connections.map((c) => (
            <SocialConnectionCard key={c.profile_id} connection={c} />
          ))}
        </div>
      )}
    </div>
  );
}

type PublicProfileConnectionsPanelProps = {
  profileId: string;
  compact?: boolean;
};

export function PublicProfileConnectionsPanel({
  profileId,
  compact,
}: PublicProfileConnectionsPanelProps) {
  const fetchFollowing = useServerFn(listPublicProfileFollows);
  const fetchFollowers = useServerFn(listPublicProfileFollowers);

  const followingQ = useQuery({
    queryKey: ["public-profile-following", profileId],
    queryFn: async () => {
      const rows = await fetchFollowing({ data: { profileId, limit: 12 } });
      return rows as PublicProfileConnection[];
    },
  });

  const followersQ = useQuery({
    queryKey: ["public-profile-followers", profileId],
    queryFn: async () => {
      const rows = await fetchFollowers({ data: { profileId, limit: 12 } });
      return rows as PublicProfileConnection[];
    },
  });

  return (
    <Card className={compact ? "p-4 shadow-card space-y-6" : "p-5 shadow-card space-y-8"}>
      {!compact ? (
        <div className="flex items-center gap-2">
          <Users className="size-5 text-primary" />
          <h2 className="font-semibold text-base">Conexões</h2>
        </div>
      ) : null}

      <ConnectionSection
        title="Seguindo"
        icon={UserCheck}
        connections={followingQ.data ?? []}
        isLoading={followingQ.isLoading}
        emptyText="Ainda não segue ninguém."
      />

      <ConnectionSection
        title="Seguidores"
        icon={Users}
        connections={followersQ.data ?? []}
        isLoading={followersQ.isLoading}
        emptyText="Nenhum seguidor ainda."
      />
    </Card>
  );
}

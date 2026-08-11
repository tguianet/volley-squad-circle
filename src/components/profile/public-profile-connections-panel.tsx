import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AsyncQueryState } from "@/components/ui/async-query-state";
import { listPublicProfileFollowers, listPublicProfileFollows } from "@/lib/ranking.functions";
import type { PublicProfileConnection } from "@/lib/profile-follow.types";
import { profileRoute } from "@/lib/profile-follow.utils";
import { useAvatarUrl } from "@/components/avatar-thumb";
import { UserCheck, Users } from "lucide-react";

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
  isError,
  error,
  emptyText,
  errorText,
  onRetry,
}: {
  title: string;
  icon: typeof Users;
  connections: PublicProfileConnection[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  emptyText: string;
  errorText: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
        {!isLoading && !isError && connections.length > 0 ? (
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {connections.length}
          </Badge>
        ) : null}
      </div>
      <AsyncQueryState
        isLoading={isLoading}
        isError={isError}
        isEmpty={connections.length === 0}
        emptyLabel={emptyText}
        errorLabel={errorText}
        onRetry={onRetry}
        devContext={title}
        devError={error}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {connections.map((c) => (
            <SocialConnectionCard key={c.profile_id} connection={c} />
          ))}
        </div>
      </AsyncQueryState>
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
      return fetchFollowing({ data: { profileId, limit: 12 } });
    },
  });

  const followersQ = useQuery({
    queryKey: ["public-profile-followers", profileId],
    queryFn: async () => {
      return fetchFollowers({ data: { profileId, limit: 12 } });
    },
  });

  const following = followingQ.data ?? [];
  const followers = followersQ.data ?? [];

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
        connections={following}
        isLoading={followingQ.isLoading}
        isError={followingQ.isError}
        error={followingQ.error}
        emptyText="Ainda não segue ninguém."
        errorText="Não foi possível carregar quem este perfil segue."
        onRetry={() => followingQ.refetch()}
      />

      <ConnectionSection
        title="Seguidores"
        icon={Users}
        connections={followers}
        isLoading={followersQ.isLoading}
        isError={followersQ.isError}
        error={followersQ.error}
        emptyText="Nenhum seguidor ainda."
        errorText="Não foi possível carregar os seguidores."
        onRetry={() => followersQ.refetch()}
      />
    </Card>
  );
}

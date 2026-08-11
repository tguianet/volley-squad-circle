import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AsyncQueryState } from "@/components/ui/async-query-state";
import { listPublicProfileFollows } from "@/lib/ranking.functions";
import type { PublicProfileConnection } from "@/lib/profile-follow.types";
import { profileRoute } from "@/lib/profile-follow.utils";
import { useAvatarUrl } from "@/components/avatar-thumb";
import { Users } from "lucide-react";

type PublicProfileConnectionsProps = {
  profileId: string;
};

function ConnectionAvatar({ connection }: { connection: PublicProfileConnection }) {
  const { data: url } = useAvatarUrl(connection.avatar_url);
  const initial = (connection.display_name[0] ?? "?").toUpperCase();
  const handle = connection.apelido ?? connection.username ?? "";

  return (
    <Link
      {...profileRoute(connection)}
      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-secondary/60 transition-colors text-center min-w-0"
    >
      <Avatar className="size-14 ring-2 ring-background shadow-sm">
        {url ? <AvatarImage src={url} alt={connection.display_name} /> : null}
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
          {initial}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs font-semibold truncate w-full">{connection.display_name}</span>
      {handle ? (
        <span className="text-[10px] text-muted-foreground truncate w-full">
          @{handle.replace(/^@/, "")}
        </span>
      ) : null}
    </Link>
  );
}

export function PublicProfileConnections({ profileId }: PublicProfileConnectionsProps) {
  const fetchConnections = useServerFn(listPublicProfileFollows);

  const connectionsQ = useQuery({
    queryKey: ["public-profile-connections", profileId],
    queryFn: async () => fetchConnections({ data: { profileId, limit: 9 } }),
  });

  const connections = connectionsQ.data ?? [];

  return (
    <Card className="p-5 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Users className="size-5 text-primary" />
        <h2 className="font-semibold text-base">Conexões</h2>
        {!connectionsQ.isLoading && !connectionsQ.isError && connections.length > 0 ? (
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {connections.length}
          </Badge>
        ) : null}
      </div>

      <AsyncQueryState
        isLoading={connectionsQ.isLoading}
        isError={connectionsQ.isError}
        isEmpty={connections.length === 0}
        emptyLabel="Nenhuma conexão pública ainda."
        errorLabel="Não foi possível carregar quem este perfil segue."
        onRetry={() => connectionsQ.refetch()}
        devContext="Seguindo"
        devError={connectionsQ.error}
      >
        <div className="grid grid-cols-3 gap-1">
          {connections.map((c) => (
            <ConnectionAvatar key={c.profile_id} connection={c} />
          ))}
        </div>
      </AsyncQueryState>
    </Card>
  );
}

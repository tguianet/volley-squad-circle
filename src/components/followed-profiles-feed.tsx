import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { listFollowedProfilesFeed } from "@/lib/ranking.functions";
import type { ProfileUpdateFeedItem } from "@/lib/profile-follow.types";
import { formatRelativeTimeBR } from "@/lib/date-format";
import { Activity, Image, Loader2, MapPin, PenLine, Sparkles, Target, Trophy } from "lucide-react";

const updateTypeIcons: Record<string, typeof Activity> = {
  bio: PenLine,
  avatar: Image,
  banner: Image,
  level: Trophy,
  position: Target,
  location: MapPin,
  general: Sparkles,
};

function profileRoute(
  item: ProfileUpdateFeedItem,
): { to: "/perfil/$username"; params: { username: string } } | { to: "/perfil" } {
  const handle = item.profile_username ?? item.profile_apelido;
  return handle
    ? { to: "/perfil/$username", params: { username: handle.replace(/^@/, "") } }
    : { to: "/perfil" };
}

export function FollowedProfilesFeed() {
  const fetchFeed = useServerFn(listFollowedProfilesFeed);

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ["followed-profiles-feed"],
    queryFn: async () => {
      const rows = await fetchFeed();
      return rows as ProfileUpdateFeedItem[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <Card className="p-6 text-center shadow-card">
        <Activity className="size-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          Nenhuma atualização dos perfis que você segue ainda.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Quando alguém que você segue alterar o perfil, aparecerá aqui.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {updates.map((item) => {
        const Icon = updateTypeIcons[item.type] ?? Activity;
        const handle = item.profile_apelido ?? item.profile_username ?? "";

        return (
          <Card key={item.id} className="p-4 shadow-card hover:shadow-md transition-shadow">
            <div className="flex gap-3">
              <Link {...profileRoute(item)} className="shrink-0">
                <Avatar className="size-10 ring-2 ring-primary/15">
                  <AvatarImage src={item.profile_avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {item.profile_name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    {...profileRoute(item)}
                    className="text-sm font-semibold hover:text-primary transition-colors"
                  >
                    {item.profile_name}
                  </Link>
                  {handle && (
                    <span className="text-xs text-muted-foreground">
                      @{handle.replace(/^@/, "")}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {formatRelativeTimeBR(item.created_at)}
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="size-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <Badge variant="outline" className="text-[10px] mt-1.5 capitalize">
                      {item.type}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

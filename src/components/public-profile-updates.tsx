import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listPublicProfileUpdates } from "@/lib/ranking.functions";
import type { PublicProfileUpdate } from "@/lib/profile-follow.types";
import { formatRelativeTimeBR } from "@/lib/date-format";
import { Activity, Image, Loader2, MapPin, PenLine, Sparkles, Target, Trophy } from "lucide-react";

const updateTypeIcons: Record<string, typeof Activity> = {
  bio: PenLine,
  avatar: Image,
  banner: Image,
  level: Trophy,
  position: Target,
  location: MapPin,
  photo: Image,
  general: Sparkles,
};

type PublicProfileUpdatesProps = {
  profileId: string;
};

export function PublicProfileUpdates({ profileId }: PublicProfileUpdatesProps) {
  const fetchUpdates = useServerFn(listPublicProfileUpdates);

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ["public-profile-updates", profileId],
    queryFn: async () => {
      const rows = await fetchUpdates({ data: { profileId, limit: 10 } });
      return rows as PublicProfileUpdate[];
    },
  });

  return (
    <Card className="p-5 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="size-5 text-primary" />
        <h2 className="font-semibold text-base">Atualizações</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : updates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhuma atualização recente.
        </p>
      ) : (
        <ul className="space-y-3">
          {updates.map((item) => {
            const Icon = updateTypeIcons[item.type] ?? Activity;
            return (
              <li
                key={item.id}
                className="flex gap-3 p-3 rounded-xl bg-secondary/40 border border-border/50"
              >
                <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatRelativeTimeBR(item.created_at)}
                    </span>
                  </div>
                  {item.description ? (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {item.description}
                    </p>
                  ) : null}
                  <Badge variant="outline" className="text-[10px] mt-1.5 capitalize">
                    {item.type}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRelativeTimeBR } from "@/lib/date-format";
import type { FollowedProfile } from "@/lib/profile-follow.types";
import { ExternalLink, UserMinus } from "lucide-react";

type FollowedProfileCardProps = {
  profile: FollowedProfile;
  onUnfollow: (profileId: string) => void;
  isUnfollowing?: boolean;
};

function profileHandle(profile: FollowedProfile) {
  return profile.apelido ?? profile.username ?? profile.display_name;
}

function profileRoute(
  profile: FollowedProfile,
): { to: "/perfil/$username"; params: { username: string } } | { to: "/perfil" } {
  const handle = profile.username ?? profile.apelido;
  return handle
    ? { to: "/perfil/$username", params: { username: handle.replace(/^@/, "") } }
    : { to: "/perfil" };
}

export function FollowedProfileCard({
  profile,
  onUnfollow,
  isUnfollowing,
}: FollowedProfileCardProps) {
  const handle = profileHandle(profile);

  return (
    <Card className="p-4 shadow-card hover:shadow-md transition-shadow border-border/60">
      <div className="flex items-start gap-3">
        <Avatar className="size-14 ring-2 ring-primary/20 shrink-0">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.display_name} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {profile.display_name[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-semibold text-base truncate">{profile.display_name}</h4>
              <p className="text-xs text-muted-foreground truncate">@{handle.replace(/^@/, "")}</p>
            </div>
            {profile.category && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {profile.category}
              </Badge>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Atualizado {formatRelativeTimeBR(profile.last_updated_at)}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" asChild>
              <Link {...profileRoute(profile)}>
                <ExternalLink className="size-3.5" />
                Ver perfil
              </Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs gap-1 text-muted-foreground hover:text-destructive"
              onClick={() => onUnfollow(profile.profile_id)}
              disabled={isUnfollowing}
            >
              <UserMinus className="size-3.5" />
              Deixar de seguir
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

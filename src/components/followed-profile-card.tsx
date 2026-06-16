import { Link } from "@tanstack/react-router";
import { useAvatarUrl } from "@/components/avatar-thumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { FollowedProfile } from "@/lib/profile-follow.types";
import { formatMutualConnections, profileHandle, profileRoute } from "@/lib/profile-follow.utils";
import { cn } from "@/lib/utils";
import { Loader2, UserMinus } from "lucide-react";

type FollowedProfileCardProps = {
  profile: FollowedProfile;
  onUnfollow: (profileId: string) => void;
  isUnfollowing?: boolean;
  className?: string;
};

function ProfilePhoto({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const { data: url, isLoading } = useAvatarUrl(avatarUrl);
  const initial = (name[0] ?? "?").toUpperCase();

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/40">
      {isLoading ? (
        <div className="flex size-full items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary/50" />
        </div>
      ) : url ? (
        <img src={url} alt={name} className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center bg-primary/5">
          <span className="font-display text-5xl text-primary/35 select-none">{initial}</span>
        </div>
      )}
    </div>
  );
}

export function FollowedProfileCard({
  profile,
  onUnfollow,
  isUnfollowing,
  className,
}: FollowedProfileCardProps) {
  const handle = profileHandle(profile);
  const mutualText = formatMutualConnections(profile.mutual_connections_count);

  return (
    <Card
      className={cn(
        "overflow-hidden border border-border/70 shadow-card hover:shadow-md transition-shadow p-0 gap-0",
        className,
      )}
    >
      <ProfilePhoto avatarUrl={profile.avatar_url} name={profile.display_name} />

      <div className="flex flex-col gap-2 p-3.5 pt-3">
        <div className="min-w-0 space-y-0.5">
          <h4 className="font-semibold text-[15px] leading-tight truncate">
            {profile.display_name}
          </h4>
          <p className="text-xs text-muted-foreground truncate">@{handle.replace(/^@/, "")}</p>
        </div>

        {profile.category ? (
          <Badge variant="secondary" className="w-fit text-[10px] font-medium px-2 py-0">
            {profile.category}
          </Badge>
        ) : null}

        {mutualText ? (
          <p className="text-[11px] text-muted-foreground leading-snug">{mutualText}</p>
        ) : null}

        <div className="flex flex-col gap-1.5 pt-1">
          <Button
            size="sm"
            variant="secondary"
            className="w-full h-9 text-xs font-semibold"
            asChild
          >
            <Link {...profileRoute(profile)}>Ver perfil</Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="w-full h-8 text-[11px] text-muted-foreground hover:text-destructive gap-1"
            onClick={() => onUnfollow(profile.profile_id)}
            disabled={isUnfollowing}
          >
            {isUnfollowing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <UserMinus className="size-3" />
            )}
            Deixar de seguir
          </Button>
        </div>
      </div>
    </Card>
  );
}

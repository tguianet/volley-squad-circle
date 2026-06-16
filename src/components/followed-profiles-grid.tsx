import type { FollowedProfile } from "@/lib/profile-follow.types";
import { FollowedProfileCard } from "@/components/followed-profile-card";
import { cn } from "@/lib/utils";

type FollowedProfilesGridProps = {
  profiles: FollowedProfile[];
  onUnfollow: (profileId: string) => void;
  isUnfollowing?: boolean;
  className?: string;
};

export function FollowedProfilesGrid({
  profiles,
  onUnfollow,
  isUnfollowing,
  className,
}: FollowedProfilesGridProps) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", className)}>
      {profiles.map((profile) => (
        <FollowedProfileCard
          key={profile.follow_id}
          profile={profile}
          onUnfollow={onUnfollow}
          isUnfollowing={isUnfollowing}
        />
      ))}
    </div>
  );
}

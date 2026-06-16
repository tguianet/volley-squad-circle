import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FollowedProfile } from "@/lib/profile-follow.types";
import { FollowedProfilesGrid } from "@/components/followed-profiles-grid";

type FollowedProfilesAllModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: FollowedProfile[];
  onUnfollow: (profileId: string) => void;
  isUnfollowing?: boolean;
};

export function FollowedProfilesAllModal({
  open,
  onOpenChange,
  profiles,
  onUnfollow,
  isUnfollowing,
}: FollowedProfilesAllModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Perfis seguidos</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {profiles.length} {profiles.length === 1 ? "perfil seguido" : "perfis seguidos"}
          </p>
        </DialogHeader>
        <div className="overflow-y-auto pr-1 -mr-1">
          <FollowedProfilesGrid
            profiles={profiles}
            onUnfollow={onUnfollow}
            isUnfollowing={isUnfollowing}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

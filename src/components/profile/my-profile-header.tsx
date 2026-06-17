import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileBanner } from "@/components/profile-banner";
import { ProfileAvatar } from "@/components/profile-avatar";
import {
  MyProfileEditDialog,
  type MyProfileFormData,
} from "@/components/profile/my-profile-edit-dialog";

type MyProfileHeaderProps = {
  profile: MyProfileFormData;
  displayName: string;
  username: string;
  fallbackInitial: string;
};

export function MyProfileHeader({
  profile,
  displayName,
  username,
  fallbackInitial,
}: MyProfileHeaderProps) {
  return (
    <Card className="overflow-hidden shadow-card border-border/80 p-0 gap-0">
      <ProfileBanner compact />

      <div className="px-4 sm:px-6 pb-4 sm:pb-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 -mt-12 sm:-mt-14 relative z-10">
          <div className="relative shrink-0">
            <ProfileAvatar
              fallback={fallbackInitial}
              className="size-24 sm:size-28 ring-4 ring-background shadow-lg"
              editable
            />
          </div>

          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3">
            <div className="min-w-0 space-y-0.5">
              <h1 className="font-display text-xl sm:text-2xl font-bold leading-tight truncate">
                {displayName}
              </h1>
              <p className="text-sm text-muted-foreground">@{username.replace(/^@/, "")}</p>
              {(profile.posicao_principal || profile.level) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {profile.posicao_principal ? (
                    <Badge variant="secondary" className="text-[10px]">
                      {profile.posicao_principal}
                    </Badge>
                  ) : null}
                  {profile.level ? (
                    <Badge className="gradient-beach text-white border-0 text-[10px]">
                      {profile.level}
                    </Badge>
                  ) : null}
                </div>
              )}
            </div>
            <MyProfileEditDialog
              profile={profile}
              displayName={displayName}
              fallbackInitial={fallbackInitial}
            />
          </div>
        </div>

        {profile.bio ? (
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed border-t border-border/60 pt-4">
            {profile.bio}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listMyFollowedProfiles, unfollowProfile } from "@/lib/ranking.functions";
import type { FollowedProfile } from "@/lib/profile-follow.types";
import { FollowedProfileCard } from "@/components/followed-profile-card";
import { ProfileSearchModal } from "@/components/profile-search-modal";
import { FollowedProfilesFeed } from "@/components/followed-profiles-feed";
import { Loader2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

export function FollowProfilesSection() {
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);

  const fetchFollowed = useServerFn(listMyFollowedProfiles);
  const unfollowProfileFn = useServerFn(unfollowProfile);

  const { data: followedProfiles = [], isLoading } = useQuery({
    queryKey: ["my-followed-profiles"],
    queryFn: async () => {
      const rows = await fetchFollowed();
      return rows as FollowedProfile[];
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async (profileId: string) => {
      await unfollowProfileFn({ data: { profileId } });
    },
    onSuccess: () => {
      toast.success("Você deixou de seguir este perfil");
      queryClient.invalidateQueries({ queryKey: ["my-followed-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["followed-profiles-feed"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Erro ao deixar de seguir"),
  });

  const followedIds = new Set(followedProfiles.map((p) => p.profile_id));

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["my-followed-profiles"] });
    queryClient.invalidateQueries({ queryKey: ["followed-profiles-feed"] });
  };

  return (
    <div className="space-y-5">
      <Card className="p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Perfis seguidos</h2>
            {followedProfiles.length > 0 && (
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {followedProfiles.length}
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => setSearchOpen(true)}
          >
            <UserPlus className="size-3.5" />
            Encontrar
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : followedProfiles.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center bg-secondary/30 rounded-xl">
            <Users className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Você ainda não segue nenhum perfil
            </p>
            <Button
              size="sm"
              className="gradient-beach text-white border-0 gap-1"
              onClick={() => setSearchOpen(true)}
            >
              <UserPlus className="size-3.5" />
              Encontrar perfis
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {followedProfiles.map((profile) => (
              <FollowedProfileCard
                key={profile.follow_id}
                profile={profile}
                onUnfollow={(id) => unfollowMutation.mutate(id)}
                isUnfollowing={unfollowMutation.isPending}
              />
            ))}
          </div>
        )}
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 px-1">
          Atualizações dos perfis seguidos
        </h3>
        <FollowedProfilesFeed />
      </div>

      <ProfileSearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        followedIds={followedIds}
        onFollowSuccess={() => {
          invalidateAll();
          setSearchOpen(false);
        }}
      />
    </div>
  );
}

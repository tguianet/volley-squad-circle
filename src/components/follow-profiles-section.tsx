import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listMyFollowedProfiles, unfollowProfile } from "@/lib/ranking.functions";
import type { FollowedProfile } from "@/lib/profile-follow.types";
import { FOLLOWED_PROFILES_PREVIEW_LIMIT } from "@/lib/profile-follow.utils";
import { FollowedProfilesGrid } from "@/components/followed-profiles-grid";
import { FollowedProfilesAllModal } from "@/components/followed-profiles-all-modal";
import { ProfileSearchModal } from "@/components/profile-search-modal";
import { FollowedProfilesFeed } from "@/components/followed-profiles-feed";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";

export function FollowProfilesSection() {
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);

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
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Erro ao deixar de seguir")),
  });

  const followedIds = new Set(followedProfiles.map((p) => p.profile_id));
  const total = followedProfiles.length;
  const previewProfiles = followedProfiles.slice(0, FOLLOWED_PROFILES_PREVIEW_LIMIT);
  const hasMore = total > FOLLOWED_PROFILES_PREVIEW_LIMIT;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["my-followed-profiles"] });
    queryClient.invalidateQueries({ queryKey: ["followed-profiles-feed"] });
  };

  const handleUnfollow = (profileId: string) => {
    unfollowMutation.mutate(profileId);
  };

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden shadow-card border-border/80">
        <div className="px-5 pt-5 pb-4 border-b border-border/60 bg-secondary/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <h2 className="font-display text-xl font-semibold tracking-tight">Perfis Seguidos</h2>
              {!isLoading && (
                <p className="text-sm text-muted-foreground">
                  {total === 0
                    ? "Nenhum perfil seguido ainda"
                    : total === 1
                      ? "1 perfil seguido"
                      : `${total} perfis seguidos`}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {hasMore ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-primary font-semibold hover:text-primary/90 h-9 px-3"
                  onClick={() => setAllOpen(true)}
                >
                  Ver todos
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-9 border-primary/25 hover:bg-primary/5"
                onClick={() => setSearchOpen(true)}
              >
                <UserPlus className="size-3.5" />
                Encontrar
              </Button>
            </div>
          </div>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : total === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center rounded-xl bg-secondary/25 border border-dashed border-border/80">
              <div className="size-16 rounded-2xl gradient-beach flex items-center justify-center shadow-glow opacity-90">
                <UserPlus className="size-8 text-white" />
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="font-medium text-sm">Siga jogadores da comunidade</p>
                <p className="text-xs text-muted-foreground">
                  Encontre perfis e acompanhe novidades na sua timeline.
                </p>
              </div>
              <Button
                size="sm"
                className="gradient-beach text-white border-0 gap-1.5 shadow-glow"
                onClick={() => setSearchOpen(true)}
              >
                <UserPlus className="size-3.5" />
                Encontrar perfis
              </Button>
            </div>
          ) : (
            <>
              <FollowedProfilesGrid
                profiles={previewProfiles}
                onUnfollow={handleUnfollow}
                isUnfollowing={unfollowMutation.isPending}
              />
              {hasMore ? (
                <div className="mt-4 pt-4 border-t border-border/60 flex justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="font-semibold min-w-[140px]"
                    onClick={() => setAllOpen(true)}
                  >
                    Ver todos ({total})
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
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

      <FollowedProfilesAllModal
        open={allOpen}
        onOpenChange={setAllOpen}
        profiles={followedProfiles}
        onUnfollow={handleUnfollow}
        isUnfollowing={unfollowMutation.isPending}
      />
    </div>
  );
}

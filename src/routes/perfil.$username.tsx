import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ArrowLeft, UserPlus, UserMinus } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getPublicProfileByUsername,
  getProfileFollowStatus,
  followProfile,
  unfollowProfile,
} from "@/lib/ranking.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl } from "@/components/avatar-thumb";
import { PublicProfileCover } from "@/components/public-profile-cover";
import { PublicProfileTabs } from "@/components/profile/public-profile-tabs";
import { getErrorMessage } from "@/lib/utils";
import { normalizeProfileHandle } from "@/lib/media-url";

type PublicProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
  apelido: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  whatsapp: string | null;
  instagram: string | null;
  posicao_principal: string | null;
  level: string | null;
  mao_dominante: string | null;
  altura: number | null;
  avatar_url: string | null;
  banner_url: string | null;
  genero: string | null;
  status: string | null;
  pontos: number | null;
  vitorias: number | null;
  derrotas: number | null;
};

export const Route = createFileRoute("/perfil/$username")({
  head: () => ({ meta: [{ title: "Perfil Público — PlayBeach" }] }),
  component: PublicProfilePage,
});

function ProfileAvatarHero({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const { data: url } = useAvatarUrl(avatarUrl);
  const initial = (name[0] ?? "?").toUpperCase();

  return (
    <Avatar className="size-24 sm:size-28 ring-4 ring-background shadow-lg shrink-0">
      {url ? <AvatarImage src={url} alt={name} /> : null}
      <AvatarFallback className="text-3xl font-display font-semibold bg-primary/10 text-primary">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}

function PublicProfilePage() {
  const { username } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const getPublicProfileFn = useServerFn(getPublicProfileByUsername);
  const getFollowStatusFn = useServerFn(getProfileFollowStatus);
  const followProfileFn = useServerFn(followProfile);
  const unfollowProfileFn = useServerFn(unfollowProfile);

  const {
    data: profile,
    isLoading: isLoadingProfile,
    error: profileError,
  } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: async () => {
      const handle = normalizeProfileHandle(username);
      try {
        const fromServer = (await getPublicProfileFn({
          data: { username: handle },
        })) as PublicProfile | null;
        if (fromServer) return fromServer;
      } catch {
        // fallback client
      }
      const { data: rows, error } = await supabase.rpc("get_public_profile_by_username", {
        p_username: handle,
      });
      if (error) throw error;
      const row = rows?.[0] as PublicProfile | undefined;
      if (
        !row &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(handle)
      ) {
        const { data: byId, error: idError } = await supabase
          .from("profiles")
          .select(
            "id, display_name, username, apelido, bio, city, state, whatsapp, instagram, posicao_principal, level, mao_dominante, altura, avatar_url, banner_url, genero, status, pontos, vitorias, derrotas",
          )
          .eq("id", handle)
          .maybeSingle();
        if (idError) throw idError;
        if (byId) return byId as PublicProfile;
      }
      if (!row) throw new Error("Perfil não encontrado");
      return row;
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: followStatus, isLoading: isLoadingFollowStatus } = useQuery({
    queryKey: ["profile-follow-status", profile?.id],
    queryFn: () => getFollowStatusFn({ data: { profileId: profile!.id } }),
    enabled: !!profile && !!currentUser && currentUser.id !== profile.id,
  });

  const followMutation = useMutation({
    mutationFn: async (profileId: string) => {
      await followProfileFn({ data: { profileId } });
    },
    onSuccess: () => {
      toast.success("Você está seguindo este perfil!");
      qc.invalidateQueries({ queryKey: ["profile-follow-status", profile?.id] });
      qc.invalidateQueries({ queryKey: ["my-followed-profiles"] });
      qc.invalidateQueries({ queryKey: ["followed-profiles-feed"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Erro ao seguir")),
  });

  const unfollowMutation = useMutation({
    mutationFn: async (profileId: string) => {
      await unfollowProfileFn({ data: { profileId } });
    },
    onSuccess: () => {
      toast.success("Você deixou de seguir este perfil");
      qc.invalidateQueries({ queryKey: ["profile-follow-status", profile?.id] });
      qc.invalidateQueries({ queryKey: ["my-followed-profiles"] });
      qc.invalidateQueries({ queryKey: ["followed-profiles-feed"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Erro ao deixar de seguir")),
  });

  if (isLoadingProfile) {
    return (
      <AppLayout>
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (profileError || !profile) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Button variant="ghost" onClick={() => navigate({ to: "/perfil" })} className="mb-4">
            <ArrowLeft className="size-4 mr-2" />
            Voltar
          </Button>
          <Card className="p-10 text-center shadow-card">
            <p className="text-muted-foreground">Perfil não encontrado</p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const isOwnProfile = !!currentUser && currentUser.id === profile.id;
  const displayName = profile.display_name || "Jogador";
  const usernameDisplay = profile.apelido || profile.username || username;
  const aboutData = {
    bio: profile.bio,
    city: profile.city,
    state: profile.state,
    altura: profile.altura,
    mao_dominante: profile.mao_dominante,
    posicao_principal: profile.posicao_principal,
    level: profile.level,
    instagram: profile.instagram,
    whatsapp: profile.whatsapp,
  };

  const followButton = (() => {
    if (isOwnProfile) {
      return (
        <Button size="sm" variant="outline" asChild className="shrink-0">
          <Link to="/perfil">Meu perfil</Link>
        </Button>
      );
    }
    if (isLoadingFollowStatus) {
      return (
        <Button size="sm" disabled className="shrink-0 min-w-[120px]">
          <Loader2 className="size-4 animate-spin" />
        </Button>
      );
    }
    if (followStatus?.following) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => unfollowMutation.mutate(profile.id)}
          disabled={unfollowMutation.isPending}
          className="gap-1.5 shrink-0"
        >
          {unfollowMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserMinus className="size-4" />
          )}
          Deixar de seguir
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        className="gradient-beach text-white border-0 gap-1.5 shrink-0 shadow-glow"
        onClick={() => followMutation.mutate(profile.id)}
        disabled={followMutation.isPending}
      >
        {followMutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <UserPlus className="size-4" />
        )}
        Seguir
      </Button>
    );
  })();

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/perfil" })}
          className="-ml-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4 mr-1.5" />
          Voltar
        </Button>

        {/* Header — inalterado */}
        <Card className="overflow-hidden shadow-card border-border/80 p-0 gap-0">
          <PublicProfileCover bannerUrl={profile.banner_url} />
          <div className="px-4 sm:px-6 pb-4 sm:pb-5">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 -mt-12 sm:-mt-14 relative z-10">
              <ProfileAvatarHero avatarUrl={profile.avatar_url} name={displayName} />
              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3">
                <div className="min-w-0 space-y-0.5">
                  <h1 className="font-display text-xl sm:text-2xl font-bold leading-tight truncate">
                    {displayName}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    @{usernameDisplay.replace(/^@/, "")}
                  </p>
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
                <div className="flex sm:justify-end">{followButton}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Navegação estilo rede social */}
        <PublicProfileTabs
          profile={profile}
          aboutData={aboutData}
          isOwnProfile={isOwnProfile}
          currentUserId={currentUser?.id ?? null}
        />
      </div>
    </AppLayout>
  );
}

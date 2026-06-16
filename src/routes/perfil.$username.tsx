import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  UserPlus,
  UserMinus,
  LayoutGrid,
  Info,
  ImageIcon,
  Users,
  Trophy,
} from "lucide-react";
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
import { PublicProfileGallery } from "@/components/public-profile-gallery";
import { PublicProfileAbout } from "@/components/profile/public-profile-about";
import { PublicProfileStats } from "@/components/profile/public-profile-stats";
import { PublicProfileConnectionsPanel } from "@/components/profile/public-profile-connections-panel";
import { FeedComposer } from "@/components/feed/feed-composer";
import { FeedPostList } from "@/components/feed/feed-post-list";
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

function ProfilePostsSection({
  profile,
  isOwnProfile,
  currentUserId,
}: {
  profile: PublicProfile;
  isOwnProfile: boolean;
  currentUserId: string | null;
}) {
  const feedQueryKey = ["profile-feed", profile.id] as const;

  return (
    <div className="space-y-4">
      {isOwnProfile ? (
        <FeedComposer
          userId={currentUserId}
          profile={{
            display_name: profile.display_name,
            apelido: profile.apelido,
            avatar_url: profile.avatar_url,
          }}
          feedQueryKey={feedQueryKey}
          placeholder="No que você está pensando sobre o vôlei hoje?"
        />
      ) : null}
      <FeedPostList mode="profile" profileId={profile.id} queryKey={feedQueryKey} />
    </div>
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
        const fromServer = (await getPublicProfileFn({ data: { username: handle } })) as
          | PublicProfile
          | null;
        if (fromServer) return fromServer;
      } catch {
        // fallback client
      }
      const { data: rows, error } = await supabase.rpc("get_public_profile_by_username", {
        p_username: handle,
      });
      if (error) throw error;
      const row = rows?.[0] as PublicProfile | undefined;
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

        {/* Header */}
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

        {/* Mobile: abas */}
        <div className="lg:hidden">
          <Tabs defaultValue="publicacoes" className="w-full">
            <TabsList className="w-full h-auto flex overflow-x-auto justify-start gap-0.5 bg-muted/80 p-1 rounded-xl no-scrollbar">
              <TabsTrigger value="publicacoes" className="text-xs sm:text-sm gap-1 shrink-0">
                <LayoutGrid className="size-3.5" /> Publicações
              </TabsTrigger>
              <TabsTrigger value="sobre" className="text-xs sm:text-sm gap-1 shrink-0">
                <Info className="size-3.5" /> Sobre
              </TabsTrigger>
              <TabsTrigger value="fotos" className="text-xs sm:text-sm gap-1 shrink-0">
                <ImageIcon className="size-3.5" /> Fotos
              </TabsTrigger>
              <TabsTrigger value="conexoes" className="text-xs sm:text-sm gap-1 shrink-0">
                <Users className="size-3.5" /> Conexões
              </TabsTrigger>
              <TabsTrigger value="estatisticas" className="text-xs sm:text-sm gap-1 shrink-0">
                <Trophy className="size-3.5" /> Stats
              </TabsTrigger>
            </TabsList>

            <TabsContent value="publicacoes" className="mt-3">
              <ProfilePostsSection
                profile={profile}
                isOwnProfile={isOwnProfile}
                currentUserId={currentUser?.id ?? null}
              />
            </TabsContent>
            <TabsContent value="sobre" className="mt-3">
              <PublicProfileAbout profile={aboutData} />
            </TabsContent>
            <TabsContent value="fotos" className="mt-3">
              <PublicProfileGallery profileId={profile.id} />
            </TabsContent>
            <TabsContent value="conexoes" className="mt-3">
              <PublicProfileConnectionsPanel profileId={profile.id} />
            </TabsContent>
            <TabsContent value="estatisticas" className="mt-3">
              <PublicProfileStats
                profileId={profile.id}
                pontos={profile.pontos ?? 0}
                vitorias={profile.vitorias ?? 0}
                derrotas={profile.derrotas ?? 0}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop: duas colunas */}
        <div className="hidden lg:grid lg:grid-cols-[minmax(260px,1fr)_minmax(0,1.65fr)] gap-4 items-start">
          <aside className="space-y-4 sticky top-4">
            <PublicProfileAbout profile={aboutData} compact />
            <PublicProfileGallery profileId={profile.id} />
            <PublicProfileConnectionsPanel profileId={profile.id} compact />
            <PublicProfileStats
              profileId={profile.id}
              pontos={profile.pontos ?? 0}
              vitorias={profile.vitorias ?? 0}
              derrotas={profile.derrotas ?? 0}
              compact
            />
          </aside>
          <main>
            <div className="flex items-center gap-2 mb-3 px-0.5">
              <LayoutGrid className="size-5 text-primary" />
              <h2 className="font-semibold text-base">Publicações</h2>
            </div>
            <ProfilePostsSection
              profile={profile}
              isOwnProfile={isOwnProfile}
              currentUserId={currentUser?.id ?? null}
            />
          </main>
        </div>
      </div>
    </AppLayout>
  );
}

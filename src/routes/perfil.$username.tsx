import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  MapPin,
  Ruler,
  Hand,
  Instagram,
  Users,
  Loader2,
  ArrowLeft,
  UserPlus,
  UserMinus,
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
    queryFn: () => getPublicProfileFn({ data: { username } }) as Promise<PublicProfile>,
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
    onError: (e: Error) => toast.error(e.message ?? "Erro ao seguir"),
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
    onError: (e: Error) => toast.error(e.message ?? "Erro ao deixar de seguir"),
  });

  if (isLoadingProfile) {
    return (
      <AppLayout>
        <div className="flex justify-center py-8">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (profileError || !profile) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-4">
          <Button variant="ghost" onClick={() => navigate({ to: "/perfil" })} className="mb-4">
            <ArrowLeft className="size-4 mr-2" />
            Voltar
          </Button>
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Perfil não encontrado</p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const isOwnProfile = currentUser && currentUser.id === profile.id;
  const displayName = profile.display_name || "Jogador";
  const usernameDisplay = profile.apelido || profile.username || username;
  const fallbackInitial = (displayName[0] ?? "?").toUpperCase();

  const getFollowButton = () => {
    if (isOwnProfile) return null;
    if (isLoadingFollowStatus) {
      return (
        <Button size="sm" disabled>
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
          className="gap-1"
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
        className="gradient-beach text-white border-0 gap-1"
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
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <Button variant="ghost" onClick={() => navigate({ to: "/perfil" })} className="mb-2">
          <ArrowLeft className="size-4 mr-2" />
          Voltar
        </Button>

        <div className="relative h-40 sm:h-48 rounded-xl overflow-hidden bg-gradient-to-r from-primary/20 to-primary/5">
          {profile.banner_url ? (
            <img src={profile.banner_url} alt="" className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="px-4 -mt-16">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <Avatar className="size-24 ring-4 ring-background shadow-lg">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl font-semibold">{fallbackInitial}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <p className="text-muted-foreground">@{usernameDisplay}</p>
            </div>
            {getFollowButton()}
          </div>
        </div>

        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profile.city && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="size-4 text-muted-foreground" />
                <span>
                  {profile.city}
                  {profile.state ? `, ${profile.state}` : ""}
                </span>
              </div>
            )}
            {profile.altura && (
              <div className="flex items-center gap-2 text-sm">
                <Ruler className="size-4 text-muted-foreground" />
                <span>{profile.altura}m</span>
              </div>
            )}
            {profile.mao_dominante && (
              <div className="flex items-center gap-2 text-sm">
                <Hand className="size-4 text-muted-foreground" />
                <span>Mão: {profile.mao_dominante}</span>
              </div>
            )}
            {profile.instagram && (
              <div className="flex items-center gap-2 text-sm">
                <Instagram className="size-4 text-muted-foreground" />
                <a
                  href={`https://instagram.com/${profile.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  @{profile.instagram.replace("@", "")}
                </a>
              </div>
            )}
          </div>

          {profile.posicao_principal && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{profile.posicao_principal}</Badge>
              {profile.level && <Badge variant="outline">{profile.level}</Badge>}
            </div>
          )}

          {profile.bio && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">{profile.bio}</p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="size-5" />
            Estatísticas
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{profile.pontos ?? 0}</div>
              <div className="text-xs text-muted-foreground">Pontos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{profile.vitorias ?? 0}</div>
              <div className="text-xs text-muted-foreground">Vitórias</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{profile.derrotas ?? 0}</div>
              <div className="text-xs text-muted-foreground">Derrotas</div>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

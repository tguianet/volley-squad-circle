import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
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
  Trophy,
  Loader2,
  ArrowLeft,
  UserPlus,
  UserMinus,
  Target,
  Info,
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
import { PublicProfileConnections } from "@/components/public-profile-connections";
import { PublicProfileGallery } from "@/components/public-profile-gallery";
import { PublicProfileUpdates } from "@/components/public-profile-updates";
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
    <Avatar className="size-28 sm:size-32 ring-4 ring-background shadow-lg shrink-0">
      {url ? <AvatarImage src={url} alt={name} /> : null}
      <AvatarFallback className="text-3xl font-display font-semibold bg-primary/10 text-primary">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}

function AboutRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <Icon className="size-4 text-primary mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm font-medium mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
  accentClass,
}: {
  label: string;
  value: number;
  accentClass?: string;
}) {
  return (
    <div className="text-center p-3 rounded-xl bg-secondary/50">
      <div className={`font-display text-2xl sm:text-3xl leading-none ${accentClass ?? ""}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">{label}</div>
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
        // fallback direto no client (ex.: falha transitória do server fn)
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
        <div className="max-w-4xl mx-auto px-4 py-6">
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

  const isOwnProfile = currentUser && currentUser.id === profile.id;
  const displayName = profile.display_name || "Jogador";
  const usernameDisplay = profile.apelido || profile.username || username;
  const matches = (profile.vitorias ?? 0) + (profile.derrotas ?? 0);
  const winRate = matches > 0 ? Math.round(((profile.vitorias ?? 0) / matches) * 100) : 0;

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

  const hasAbout =
    profile.city ||
    profile.altura ||
    profile.mao_dominante ||
    profile.posicao_principal ||
    profile.level ||
    profile.instagram ||
    profile.bio;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/perfil" })}
          className="-ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4 mr-1.5" />
          Voltar
        </Button>

        {/* Header social */}
        <Card className="overflow-hidden shadow-card border-border/80 p-0 gap-0">
          <PublicProfileCover bannerUrl={profile.banner_url} />

          <div className="px-4 sm:px-6 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 sm:-mt-16 relative z-10">
              <ProfileAvatarHero avatarUrl={profile.avatar_url} name={displayName} />

              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-0.5">
                <div className="min-w-0 space-y-1">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight truncate">
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

            {profile.bio ? (
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed border-t border-border/60 pt-4">
                {profile.bio}
              </p>
            ) : null}
          </div>
        </Card>

        {/* Conteúdo em colunas */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {hasAbout ? (
              <Card className="p-5 shadow-card">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="size-5 text-primary" />
                  <h2 className="font-semibold text-base">Sobre</h2>
                </div>
                <div className="divide-y divide-border/50">
                  {profile.city ? (
                    <AboutRow icon={MapPin} label="Localização">
                      {profile.city}
                      {profile.state ? `, ${profile.state}` : ""}
                    </AboutRow>
                  ) : null}
                  {profile.altura ? (
                    <AboutRow icon={Ruler} label="Altura">
                      {profile.altura} m
                    </AboutRow>
                  ) : null}
                  {profile.mao_dominante ? (
                    <AboutRow icon={Hand} label="Mão dominante">
                      {profile.mao_dominante}
                    </AboutRow>
                  ) : null}
                  {profile.posicao_principal ? (
                    <AboutRow icon={Target} label="Posição">
                      {profile.posicao_principal}
                    </AboutRow>
                  ) : null}
                  {profile.level ? (
                    <AboutRow icon={Trophy} label="Nível">
                      {profile.level}
                    </AboutRow>
                  ) : null}
                  {profile.instagram ? (
                    <AboutRow icon={Instagram} label="Instagram">
                      <a
                        href={`https://instagram.com/${profile.instagram.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        @{profile.instagram.replace("@", "")}
                      </a>
                    </AboutRow>
                  ) : null}
                </div>
              </Card>
            ) : null}

            <PublicProfileUpdates profileId={profile.id} />
            <PublicProfileGallery profileId={profile.id} />
          </div>

          <div className="space-y-4">
            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="size-5 text-primary" />
                <h2 className="font-semibold text-base">Estatísticas</h2>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <StatBlock label="Pontos" value={profile.pontos ?? 0} />
                <StatBlock
                  label="Vitórias"
                  value={profile.vitorias ?? 0}
                  accentClass="text-green-600"
                />
                <StatBlock
                  label="Derrotas"
                  value={profile.derrotas ?? 0}
                  accentClass="text-red-600"
                />
              </div>
              {matches > 0 ? (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  {matches} jogos · {winRate}% de aproveitamento
                </p>
              ) : null}
            </Card>

            <PublicProfileConnections profileId={profile.id} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

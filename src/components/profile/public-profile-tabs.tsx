import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PublicProfileAbout,
  type PublicProfileAboutData,
} from "@/components/profile/public-profile-about";
import { PublicProfileStats } from "@/components/profile/public-profile-stats";
import { PublicProfileConnectionsPanel } from "@/components/profile/public-profile-connections-panel";
import { PublicProfileGallery } from "@/components/public-profile-gallery";
import { FeedComposer } from "@/components/feed/feed-composer";
import { FeedPostList } from "@/components/feed/feed-post-list";
import { cn } from "@/lib/utils";
import { ChevronDown, Film, Trophy, Calendar, BarChart3 } from "lucide-react";

export type ProfileTabId =
  | "tudo"
  | "sobre"
  | "amigos"
  | "fotos"
  | "reels"
  | "estatisticas"
  | "partidas"
  | "ranking";

type ProfileCore = {
  id: string;
  display_name: string | null;
  apelido: string | null;
  avatar_url: string | null;
  pontos: number | null;
  vitorias: number | null;
  derrotas: number | null;
};

type PublicProfileTabsProps = {
  profile: ProfileCore;
  aboutData: PublicProfileAboutData;
  isOwnProfile: boolean;
  currentUserId: string | null;
};

const PRIMARY_TABS: { id: ProfileTabId; label: string }[] = [
  { id: "tudo", label: "Tudo" },
  { id: "sobre", label: "Sobre" },
  { id: "amigos", label: "Amigos" },
  { id: "fotos", label: "Fotos" },
  { id: "reels", label: "Reels" },
];

const MORE_TABS: { id: ProfileTabId; label: string; icon: typeof Trophy }[] = [
  { id: "estatisticas", label: "Estatísticas", icon: BarChart3 },
  { id: "partidas", label: "Partidas", icon: Calendar },
  { id: "ranking", label: "Ranking", icon: Trophy },
];

function ProfilePostsSection({
  profile,
  isOwnProfile,
  currentUserId,
}: {
  profile: ProfileCore;
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

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative shrink-0 px-4 sm:px-5 py-3.5 text-[15px] font-semibold transition-colors rounded-none",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/40",
      )}
    >
      {label}
      {active ? (
        <span
          className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full gradient-beach"
          aria-hidden
        />
      ) : null}
    </button>
  );
}

function ReelsEmptyState() {
  return (
    <Card className="p-12 shadow-card text-center border-dashed border-border/80">
      <div className="mx-auto size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Film className="size-8 text-primary/60" />
      </div>
      <h3 className="font-semibold text-lg">Reels em breve</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
        Vídeos curtos da areia estão chegando. Fique de olho!
      </p>
    </Card>
  );
}

function PartidasPlaceholder({ profileName }: { profileName: string }) {
  return (
    <Card className="p-10 shadow-card text-center">
      <Calendar className="size-10 text-primary/50 mx-auto mb-4" />
      <h3 className="font-semibold text-base">Partidas de {profileName}</h3>
      <p className="text-sm text-muted-foreground mt-2 mb-5 max-w-sm mx-auto">
        Em breve você verá aqui o histórico de partidas deste jogador.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link to="/partidas">Ver partidas da comunidade</Link>
      </Button>
    </Card>
  );
}

function TudoOverview({ profile, aboutData, isOwnProfile, currentUserId }: PublicProfileTabsProps) {
  return (
    <div className="grid lg:grid-cols-[minmax(260px,1fr)_minmax(0,1.65fr)] gap-4 items-start">
      <main className="order-1 lg:order-2 min-w-0">
        <ProfilePostsSection
          profile={profile}
          isOwnProfile={isOwnProfile}
          currentUserId={currentUserId}
        />
      </main>
      <aside className="order-2 lg:order-1 space-y-4 min-w-0">
        <PublicProfileAbout profile={aboutData} compact />
        <PublicProfileGallery profileId={profile.id} />
        <PublicProfileConnectionsPanel profileId={profile.id} compact />
      </aside>
    </div>
  );
}

function TabPanel({ children }: { children: ReactNode }) {
  return <div className="pt-4 min-w-0">{children}</div>;
}

export function PublicProfileTabs(props: PublicProfileTabsProps) {
  const { profile, aboutData } = props;
  const [activeTab, setActiveTab] = useState<ProfileTabId>("tudo");

  const isMoreTabActive = MORE_TABS.some((t) => t.id === activeTab);
  const displayName = profile.display_name || "Jogador";

  return (
    <div className="space-y-0">
      <Card className="shadow-card border-border/80 p-0 gap-0 overflow-hidden sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
        <div className="flex items-stretch border-b border-border/60">
          <div className="flex flex-1 min-w-0 overflow-x-auto scrollbar-none">
            {PRIMARY_TABS.map((tab) => (
              <TabButton
                key={tab.id}
                label={tab.label}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "relative shrink-0 inline-flex items-center gap-1 px-4 sm:px-5 py-3.5 text-[15px] font-semibold transition-colors",
                    isMoreTabActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40",
                  )}
                >
                  Mais
                  <ChevronDown className="size-4 opacity-70" />
                  {isMoreTabActive ? (
                    <span
                      className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full gradient-beach"
                      aria-hidden
                    />
                  ) : null}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[180px]">
                {MORE_TABS.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn("gap-2 font-medium", activeTab === item.id && "text-primary")}
                  >
                    <item.icon className="size-4 opacity-70" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      <TabPanel>
        {activeTab === "tudo" ? <TudoOverview {...props} /> : null}
        {activeTab === "sobre" ? <PublicProfileAbout profile={aboutData} /> : null}
        {activeTab === "amigos" ? <PublicProfileConnectionsPanel profileId={profile.id} /> : null}
        {activeTab === "fotos" ? <PublicProfileGallery profileId={profile.id} /> : null}
        {activeTab === "reels" ? <ReelsEmptyState /> : null}
        {activeTab === "estatisticas" ? (
          <PublicProfileStats
            profileId={profile.id}
            pontos={profile.pontos ?? 0}
            vitorias={profile.vitorias ?? 0}
            derrotas={profile.derrotas ?? 0}
          />
        ) : null}
        {activeTab === "partidas" ? <PartidasPlaceholder profileName={displayName} /> : null}
        {activeTab === "ranking" ? (
          <PublicProfileStats
            profileId={profile.id}
            pontos={profile.pontos ?? 0}
            vitorias={profile.vitorias ?? 0}
            derrotas={profile.derrotas ?? 0}
          />
        ) : null}
      </TabPanel>
    </div>
  );
}

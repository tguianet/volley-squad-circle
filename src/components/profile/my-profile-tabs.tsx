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
import { ProfileGallery } from "@/components/profile-gallery";
import { FollowProfilesSection } from "@/components/follow-profiles-section";
import { FeedComposer } from "@/components/feed/feed-composer";
import { FeedPostList } from "@/components/feed/feed-post-list";
import { MyProfileChallengesPanel } from "@/components/profile/my-profile-challenges-panel";
import { cn } from "@/lib/utils";
import { ChevronDown, Film, Trophy, Calendar, BarChart3, Users } from "lucide-react";

export type MyProfileTabId =
  | "tudo"
  | "sobre"
  | "amigos"
  | "fotos"
  | "reels"
  | "desafios"
  | "estatisticas"
  | "times"
  | "ranking"
  | "partidas";

type MyProfileCore = {
  id: string;
  display_name: string | null;
  apelido: string | null;
  avatar_url: string | null;
  pontos: number | null;
  vitorias: number | null;
  derrotas: number | null;
};

type MyProfileTabsProps = {
  profile: MyProfileCore;
  aboutData: PublicProfileAboutData;
  teamsSection: ReactNode;
  matchesSection: ReactNode;
};

const PRIMARY_TABS: { id: MyProfileTabId; label: string }[] = [
  { id: "tudo", label: "Tudo" },
  { id: "sobre", label: "Sobre" },
  { id: "amigos", label: "Amigos" },
  { id: "fotos", label: "Fotos" },
  { id: "reels", label: "Reels" },
  { id: "desafios", label: "Desafios" },
];

const MORE_TABS: { id: MyProfileTabId; label: string; icon: typeof Trophy }[] = [
  { id: "estatisticas", label: "Estatísticas", icon: BarChart3 },
  { id: "times", label: "Times", icon: Users },
  { id: "ranking", label: "Ranking", icon: Trophy },
  { id: "partidas", label: "Partidas", icon: Calendar },
];

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

function MyProfilePostsSection({ profile }: { profile: MyProfileCore }) {
  const feedQueryKey = ["profile-feed", profile.id] as const;

  return (
    <div className="space-y-4">
      <FeedComposer
        userId={profile.id}
        profile={{
          display_name: profile.display_name,
          apelido: profile.apelido,
          avatar_url: profile.avatar_url,
        }}
        feedQueryKey={feedQueryKey}
        placeholder="No que você está pensando sobre o vôlei hoje?"
      />
      <FeedPostList mode="profile" profileId={profile.id} queryKey={feedQueryKey} />
    </div>
  );
}

function TudoOverview({ profile, aboutData, teamsSection }: MyProfileTabsProps) {
  return (
    <div className="grid xl:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(240px,280px)] gap-4 items-start">
      <aside className="order-2 xl:order-1 space-y-4 min-w-0">
        <PublicProfileAbout profile={aboutData} compact />
        <PublicProfileConnectionsPanel profileId={profile.id} compact />
      </aside>

      <main className="order-1 xl:order-2 min-w-0">
        <MyProfilePostsSection profile={profile} />
      </main>

      <aside className="order-3 space-y-4 min-w-0">
        <PublicProfileStats
          profileId={profile.id}
          pontos={profile.pontos ?? 0}
          vitorias={profile.vitorias ?? 0}
          derrotas={profile.derrotas ?? 0}
          compact
        />
        <PublicProfileGallery profileId={profile.id} />
        {teamsSection}
      </aside>
    </div>
  );
}

function TabPanel({ children }: { children: ReactNode }) {
  return <div className="pt-4 min-w-0">{children}</div>;
}

export function MyProfileTabs(props: MyProfileTabsProps) {
  const { profile, aboutData, teamsSection, matchesSection } = props;
  const [activeTab, setActiveTab] = useState<MyProfileTabId>("tudo");

  const isMoreTabActive = MORE_TABS.some((t) => t.id === activeTab);

  return (
    <div className="space-y-0">
      <Card className="shadow-card border-border/60 p-0 gap-0 overflow-hidden sticky top-0 z-20 bg-card backdrop-blur-md rounded-none sm:rounded-2xl">
        <div className="flex items-stretch border-b border-border/60 bg-secondary/20">
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
        {activeTab === "amigos" ? (
          <div className="space-y-4">
            <PublicProfileConnectionsPanel profileId={profile.id} />
            <FollowProfilesSection />
          </div>
        ) : null}
        {activeTab === "fotos" ? <ProfileGallery /> : null}
        {activeTab === "reels" ? <ReelsEmptyState /> : null}
        {activeTab === "desafios" ? <MyProfileChallengesPanel /> : null}
        {activeTab === "estatisticas" ? (
          <PublicProfileStats
            profileId={profile.id}
            pontos={profile.pontos ?? 0}
            vitorias={profile.vitorias ?? 0}
            derrotas={profile.derrotas ?? 0}
          />
        ) : null}
        {activeTab === "times" ? teamsSection : null}
        {activeTab === "ranking" ? (
          <PublicProfileStats
            profileId={profile.id}
            pontos={profile.pontos ?? 0}
            vitorias={profile.vitorias ?? 0}
            derrotas={profile.derrotas ?? 0}
          />
        ) : null}
        {activeTab === "partidas" ? (
          <div className="space-y-4">
            {matchesSection}
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link to="/partidas">Ver todas as partidas</Link>
            </Button>
          </div>
        ) : null}
      </TabPanel>
    </div>
  );
}

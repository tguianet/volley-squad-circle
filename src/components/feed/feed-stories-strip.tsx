import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAvatarUrl } from "@/components/avatar-thumb";
import { Plus } from "lucide-react";

type FeedStoriesStripProps = {
  userId: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

export function FeedStoriesStrip({ userId, displayName, avatarUrl }: FeedStoriesStripProps) {
  const firstName = (displayName ?? "Você").split(" ")[0];
  const { data: signedAvatar } = useAvatarUrl(avatarUrl);

  if (!userId) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
      <Link
        to="/perfil"
        className="flex flex-col items-center gap-1.5 shrink-0 group"
      >
        <div className="relative">
          <div className="size-[72px] rounded-full p-[3px] gradient-beach shadow-glow">
            <Avatar className="size-full ring-2 ring-card">
              {signedAvatar ? <AvatarImage src={signedAvatar} alt={firstName} /> : null}
              <AvatarFallback>{firstName[0]?.toUpperCase() ?? "?"}</AvatarFallback>
            </Avatar>
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 size-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center border-2 border-card shadow-sm">
            <Plus className="size-3.5" />
          </span>
        </div>
        <span className="text-[11px] font-semibold text-foreground max-w-[72px] truncate">
          Seu highlight
        </span>
      </Link>

      {["Treinos", "Partidas", "Torneios"].map((label) => (
        <div key={label} className="flex flex-col items-center gap-1.5 shrink-0 opacity-60">
          <div className="size-[72px] rounded-full border-2 border-dashed border-border/80 bg-secondary/50 flex items-center justify-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide text-center px-1">
              {label}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">Em breve</span>
        </div>
      ))}
    </div>
  );
}

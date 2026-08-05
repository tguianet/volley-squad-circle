import { Trophy } from "lucide-react";

type TournamentsEmptyStateProps = {
  title: string;
  description: string;
};

export function TournamentsEmptyState({ title, description }: TournamentsEmptyStateProps) {
  return (
    <div className="glass-card rounded-[24px] p-10 sm:p-12 text-center col-span-full">
      <div className="size-14 mx-auto rounded-2xl gradient-beach flex items-center justify-center mb-4">
        <Trophy className="size-7 text-white" />
      </div>
      <p className="font-display text-2xl tracking-wide mb-2">{title}</p>
      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
        {description}
      </p>
    </div>
  );
}

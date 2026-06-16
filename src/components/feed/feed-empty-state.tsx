import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

type FeedEmptyStateProps = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export function FeedEmptyState({ title, description, icon: Icon }: FeedEmptyStateProps) {
  return (
    <Card className="p-10 shadow-card border-dashed border-border/80 text-center">
      <div className="mx-auto size-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="size-7 text-primary/60" />
      </div>
      <h3 className="font-semibold text-base">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">{description}</p>
    </Card>
  );
}

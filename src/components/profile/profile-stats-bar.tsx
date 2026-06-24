import { cn } from "@/lib/utils";

type ProfileStatsBarProps = {
  pontos: number;
  vitorias: number;
  derrotas: number;
  className?: string;
};

export function ProfileStatsBar({ pontos, vitorias, derrotas, className }: ProfileStatsBarProps) {
  const jogos = vitorias + derrotas;
  const winRate = jogos > 0 ? Math.round((vitorias / jogos) * 100) : 0;

  const items = [
    { label: "Pontos", value: pontos, accent: "text-primary" },
    { label: "Vitórias", value: vitorias, accent: "text-success" },
    { label: "Jogos", value: jogos, accent: "text-foreground" },
    { label: "Aproveit.", value: `${winRate}%`, accent: "text-sunset" },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl border border-border/50 bg-secondary/30 p-3 sm:p-4",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="text-center px-2 py-1">
          <div className={cn("coastal-stat text-3xl sm:text-4xl", item.accent)}>{item.value}</div>
          <div className="coastal-pill mt-1.5 inline-block">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

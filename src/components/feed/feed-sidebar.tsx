import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Medal, Trophy, TrendingUp, User, Waves } from "lucide-react";

const quickLinks = [
  { to: "/perfil", label: "Meu perfil", icon: User },
  { to: "/ranking", label: "Ranking", icon: Medal },
  { to: "/partidas", label: "Partidas", icon: Calendar },
  { to: "/torneios", label: "Torneios", icon: Trophy },
] as const;

export function FeedSidebarLeft() {
  return (
    <Card className="p-4 space-y-3 border-border/60 shadow-card sticky top-6">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
        <Waves className="size-3.5" />
        Atalhos
      </div>
      <nav className="space-y-1">
        {quickLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/80 hover:bg-secondary/70 hover:text-foreground transition"
          >
            <link.icon className="size-4 text-primary" />
            {link.label}
          </Link>
        ))}
      </nav>
      <Link to="/partidas/nova">
        <Button variant="beach" className="w-full">
          <Trophy className="size-4" />
          Criar partida
        </Button>
      </Link>
    </Card>
  );
}

export function FeedSidebarRight() {
  return (
    <div className="space-y-4 sticky top-6">
      <Card className="p-0 overflow-hidden border-border/60 shadow-card">
        <div className="gradient-ocean p-5 text-white">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-90">
            <TrendingUp className="size-3.5" />
            Temporada
          </div>
          <div className="coastal-stat text-5xl mt-2 text-white">Top 10%</div>
          <p className="text-xs opacity-80 mt-2 leading-relaxed">
            Continue jogando partidas amistosas para subir no ranking.
          </p>
          <div className="mt-4 h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full w-3/4 rounded-full bg-accent shadow-glow" />
          </div>
        </div>
      </Card>

      <Card className="p-4 border-border/60 shadow-card">
        <h3 className="font-display text-lg tracking-wide mb-3">Comunidade ao vivo</h3>
        <ul className="space-y-2.5 text-sm">
          <li className="flex items-start gap-2">
            <span className="size-2 rounded-full bg-accent mt-1.5 shrink-0" />
            <span className="text-muted-foreground">Domingo: partidas abertas nas arenas</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />
            <span className="text-muted-foreground">Ranking atualizado após cada desafio</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="size-2 rounded-full bg-success mt-1.5 shrink-0" />
            <span className="text-muted-foreground">Novos times entrando na competição</span>
          </li>
        </ul>
        <Link to="/ranking" className="block mt-4">
          <Button variant="outline" size="sm" className="w-full">
            Ver ranking completo
          </Button>
        </Link>
      </Card>
    </div>
  );
}

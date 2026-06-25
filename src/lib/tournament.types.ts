import type { Database } from "@/integrations/supabase/types";

export type TournamentFormat = Database["public"]["Enums"]["tournament_format"];
export type TournamentStatus = Database["public"]["Enums"]["tournament_status"];

export type TournamentListItem = {
  id: string;
  title: string;
  category_label: string;
  event_date: string;
  start_time: string;
  entry_fee_cents: number;
  max_teams: number;
  format: TournamentFormat;
  status: TournamentStatus;
  is_featured: boolean;
  image_url: string | null;
  enrolled_count: number;
  arena: { name: string; city: string | null } | null;
  user_registered: boolean;
};

export type TournamentTab = "ready_teams" | "team_draw";

export type TournamentBadge = {
  label: string;
  className: string;
};

export function formatTournamentFee(cents: number): string {
  if (cents <= 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
}

export function formatTournamentDateTime(eventDate: string, startTime: string): string {
  const d = new Date(`${eventDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  const datePart = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const timePart = startTime.slice(0, 5);
  return `${datePart}, ${timePart}`;
}

export function getTournamentBadge(
  status: TournamentStatus,
  enrolled: number,
  max: number,
  isFeatured: boolean,
): TournamentBadge {
  if (status === "coming_soon") {
    return { label: "Em Breve", className: "bg-muted text-muted-foreground" };
  }
  if (isFeatured || status === "featured") {
    return { label: "Destaque", className: "bg-primary text-primary-foreground" };
  }
  const ratio = max > 0 ? enrolled / max : 0;
  if (status === "last_spots" || ratio >= 0.85) {
    return { label: "Últimas Vagas", className: "bg-foreground/70 text-background" };
  }
  if (status === "closed" || status === "finished") {
    return { label: "Encerrado", className: "bg-muted text-muted-foreground" };
  }
  return {
    label: "Inscrições Abertas",
    className: "bg-accent text-accent-foreground",
  };
}

export function canRegisterTournament(
  status: TournamentStatus,
  enrolled: number,
  max: number,
  alreadyRegistered: boolean,
): boolean {
  if (alreadyRegistered) return false;
  if (status === "coming_soon" || status === "draft" || status === "closed" || status === "finished") {
    return false;
  }
  return enrolled < max;
}

export function enrollmentProgress(enrolled: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.round((enrolled / max) * 100));
}

import type { Database } from "@/integrations/supabase/types";

type TeamCategory = Database["public"]["Enums"]["team_category"];
type TeamGender = Database["public"]["Enums"]["team_gender"];

export function formatChallengeCategory(category: TeamCategory, gender: TeamGender): string {
  const base = category === "quarteto" ? "Quarteto" : "Dupla";
  if (gender === "X") return `${base} Misto`;
  return base;
}

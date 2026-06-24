import { isTeamRankingComplete, requiredTeamMemberCount } from "@/lib/team-format";

export const CHALLENGE_INVALID_MESSAGE = "Desafio inválido pelas regras do ranking.";

export function isUserTeamCaptain(
  team: { captain_id: string },
  userId: string | null | undefined,
): boolean {
  return !!userId && team.captain_id === userId;
}

export function isTeamComplete(
  category: "dupla" | "quarteto",
  memberCount: number,
): boolean {
  return isTeamRankingComplete(category, memberCount);
}

export function canChallengeTeam(myPosition: number, opponentPosition: number): boolean {
  if (myPosition === opponentPosition) return false;

  const myIsTop5 = myPosition >= 1 && myPosition <= 5;
  const opponentIsTop5 = opponentPosition >= 1 && opponentPosition <= 5;

  if (myIsTop5 && opponentIsTop5) return true;

  return opponentPosition >= myPosition - 3 && opponentPosition <= myPosition + 2;
}

export type ChallengeEligibilityBadge = "top5" | "above" | "below";

export function getChallengeEligibilityBadge(
  myPosition: number,
  opponentPosition: number,
): ChallengeEligibilityBadge | null {
  if (!canChallengeTeam(myPosition, opponentPosition)) return null;

  const myIsTop5 = myPosition >= 1 && myPosition <= 5;
  if (myIsTop5 && opponentPosition >= 1 && opponentPosition <= 5) return "top5";
  if (opponentPosition < myPosition) return "above";
  return "below";
}

export function requiredMembersForCategory(category: string): number {
  return requiredTeamMemberCount(category as "dupla" | "quarteto");
}

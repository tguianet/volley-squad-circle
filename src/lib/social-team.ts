import { categoryGenderFromFormat, type TeamCategory, type TeamGender } from "@/lib/team-format";

export type SocialTeamOption = {
  category: TeamCategory;
  gender: TeamGender;
  label: string;
};

export function getSocialTeamOptions(
  captainGender?: string | null,
  inviteeGender?: string | null,
): SocialTeamOption[] {
  if (!captainGender || !inviteeGender) return [];

  const labels =
    captainGender === "F"
      ? ["Dupla feminina", "Dupla mista", "Quarteto feminino", "Quarteto misto"]
      : ["Dupla masculina", "Dupla mista", "Quarteto masculino", "Quarteto misto"];

  return labels.flatMap((label) => {
    const format = categoryGenderFromFormat(label);
    if (format.gender !== "X" && inviteeGender !== format.gender) return [];
    if (format.category === "dupla" && format.gender === "X" && captainGender === inviteeGender) {
      return [];
    }
    return [{ ...format, label }];
  });
}

export function requiredConfirmedPlayers(category: TeamCategory): number {
  return category === "quarteto" ? 4 : 2;
}

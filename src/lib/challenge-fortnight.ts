export type ChallengeFortnightRole = "challenger" | "challenged";

export type ChallengeFortnightInfo = {
  role: ChallengeFortnightRole;
  quinzenaLabel: string;
  canCreateChallenge: boolean;
  description: string;
  nextRole: ChallengeFortnightRole;
  nextQuinzenaLabel: string;
};

/** Índice global de quinzena (0 = 1ª quinzena de jan, 1 = 2ª, …). Par = desafiante; ímpar = desafiado. */
export function getFortnightIndex(date = new Date()): number {
  const month = date.getMonth();
  const half = date.getDate() <= 15 ? 0 : 1;
  return month * 2 + half;
}

export function getCurrentFortnightInfo(date = new Date()): ChallengeFortnightInfo {
  const day = date.getDate();
  const halfLabel = day <= 15 ? "1ª quinzena" : "2ª quinzena";
  const monthName = date.toLocaleDateString("pt-BR", { month: "long" });
  const quinzenaLabel = `${halfLabel} de ${monthName}`;

  const index = getFortnightIndex(date);
  const role: ChallengeFortnightRole = index % 2 === 0 ? "challenger" : "challenged";

  const nextDate = new Date(date);
  if (day <= 15) {
    nextDate.setDate(16);
  } else {
    nextDate.setMonth(nextDate.getMonth() + 1, 1);
  }
  const nextHalf = nextDate.getDate() <= 15 ? "1ª quinzena" : "2ª quinzena";
  const nextMonth = nextDate.toLocaleDateString("pt-BR", { month: "long" });
  const nextIndex = getFortnightIndex(nextDate);

  return {
    role,
    quinzenaLabel,
    canCreateChallenge: role === "challenger",
    description:
      role === "challenger"
        ? "Nesta quinzena seu time desafia outras equipes do ranking."
        : "Nesta quinzena seu time é desafiado por outras equipes.",
    nextRole: nextIndex % 2 === 0 ? "challenger" : "challenged",
    nextQuinzenaLabel: `${nextHalf} de ${nextMonth}`,
  };
}

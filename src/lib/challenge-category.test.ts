import { describe, expect, it } from "vitest";
import { formatChallengeCategory } from "@/lib/challenge-category";

describe("formatChallengeCategory", () => {
  it("formata duplas por gênero", () => {
    expect(formatChallengeCategory("dupla", "M")).toBe("Dupla");
    expect(formatChallengeCategory("dupla", "F")).toBe("Dupla");
    expect(formatChallengeCategory("dupla", "X")).toBe("Dupla Misto");
  });

  it("formata quartetos por gênero", () => {
    expect(formatChallengeCategory("quarteto", "M")).toBe("Quarteto");
    expect(formatChallengeCategory("quarteto", "F")).toBe("Quarteto");
    expect(formatChallengeCategory("quarteto", "X")).toBe("Quarteto Misto");
  });

  it("cobre as 6 combinações válidas sem gerar rótulo vazio ou de sexteto", () => {
    const labels = (["dupla", "quarteto"] as const).flatMap((c) =>
      (["M", "F", "X"] as const).map((g) => formatChallengeCategory(c, g)),
    );
    expect(labels).toHaveLength(6);
    expect(labels.every((l) => l.length > 0)).toBe(true);
    expect(labels.some((l) => l.toLowerCase().includes("sexteto"))).toBe(false);
    expect(new Set(labels).size).toBe(4);
  });
});

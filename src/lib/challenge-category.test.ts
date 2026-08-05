import { describe, expect, it } from "vitest";
import { formatChallengeCategory } from "@/lib/challenge-category";

describe("formatChallengeCategory", () => {
  it("formata duplas", () => {
    expect(formatChallengeCategory("dupla", "M")).toBe("Dupla");
    expect(formatChallengeCategory("dupla", "F")).toBe("Dupla");
    expect(formatChallengeCategory("dupla", "X")).toBe("Dupla Misto");
  });

  it("formata quartetos", () => {
    expect(formatChallengeCategory("quarteto", "M")).toBe("Quarteto");
    expect(formatChallengeCategory("quarteto", "X")).toBe("Quarteto Misto");
  });
});

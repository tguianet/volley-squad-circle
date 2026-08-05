import { describe, expect, it } from "vitest";
import {
  categoryGenderFromFormat,
  formatFromCategory,
  getTeamFormats,
  isTeamRankingComplete,
  requiredTeamMemberCount,
} from "@/lib/team-format";

describe("getTeamFormats", () => {
  it("oferece formatos masculinos e mistos por padrão", () => {
    expect(getTeamFormats("M")).toEqual([
      "Dupla masculina",
      "Dupla mista",
      "Quarteto masculino",
      "Quarteto misto",
    ]);
  });

  it("oferece formatos femininos e mistos para atletas F", () => {
    expect(getTeamFormats("F")).toEqual([
      "Dupla feminina",
      "Dupla mista",
      "Quarteto feminino",
      "Quarteto misto",
    ]);
  });

  it("nunca oferece sexteto", () => {
    for (const gender of ["M", "F", "X", null, undefined]) {
      expect(getTeamFormats(gender).join(" ")).not.toMatch(/sexteto/i);
    }
  });
});

describe("formatFromCategory", () => {
  it("cobre as 6 combinações válidas", () => {
    expect(formatFromCategory("dupla", "M")).toBe("Dupla masculina");
    expect(formatFromCategory("dupla", "F")).toBe("Dupla feminina");
    expect(formatFromCategory("dupla", "X")).toBe("Dupla mista");
    expect(formatFromCategory("quarteto", "M")).toBe("Quarteto masculino");
    expect(formatFromCategory("quarteto", "F")).toBe("Quarteto feminino");
    expect(formatFromCategory("quarteto", "X")).toBe("Quarteto misto");
  });
});

describe("categoryGenderFromFormat", () => {
  it("faz o caminho inverso de formatFromCategory", () => {
    const combos: Array<["dupla" | "quarteto", "M" | "F" | "X"]> = [
      ["dupla", "M"],
      ["dupla", "F"],
      ["dupla", "X"],
      ["quarteto", "M"],
      ["quarteto", "F"],
      ["quarteto", "X"],
    ];
    for (const [category, gender] of combos) {
      expect(categoryGenderFromFormat(formatFromCategory(category, gender))).toEqual({
        category,
        gender,
      });
    }
  });
});

describe("requiredTeamMemberCount / isTeamRankingComplete", () => {
  it("dupla = 2, quarteto = 4", () => {
    expect(requiredTeamMemberCount("dupla")).toBe(2);
    expect(requiredTeamMemberCount("quarteto")).toBe(4);
  });

  it("só é completo com a contagem exata", () => {
    expect(isTeamRankingComplete("dupla", 2)).toBe(true);
    expect(isTeamRankingComplete("dupla", 4)).toBe(false);
    expect(isTeamRankingComplete("quarteto", 4)).toBe(true);
    expect(isTeamRankingComplete("quarteto", 2)).toBe(false);
  });
});

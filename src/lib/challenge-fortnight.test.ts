import { describe, expect, it } from "vitest";
import {
  getCurrentFortnightInfo,
  getFortnightIndex,
} from "@/lib/challenge-fortnight";

describe("getFortnightIndex", () => {
  it("usa 1ª quinzena até o dia 15", () => {
    expect(getFortnightIndex(new Date(2026, 0, 1))).toBe(0);
    expect(getFortnightIndex(new Date(2026, 0, 15))).toBe(0);
  });

  it("usa 2ª quinzena a partir do dia 16", () => {
    expect(getFortnightIndex(new Date(2026, 0, 16))).toBe(1);
    expect(getFortnightIndex(new Date(2026, 0, 31))).toBe(1);
  });

  it("avança com o mês", () => {
    expect(getFortnightIndex(new Date(2026, 1, 10))).toBe(2);
    expect(getFortnightIndex(new Date(2026, 1, 20))).toBe(3);
  });
});

describe("getCurrentFortnightInfo", () => {
  it("quinzena par = time desafiante e pode criar desafio", () => {
    const info = getCurrentFortnightInfo(new Date(2026, 0, 5));
    expect(info.role).toBe("challenger");
    expect(info.canCreateChallenge).toBe(true);
    expect(info.quinzenaLabel).toContain("1ª quinzena");
  });

  it("quinzena ímpar = time desafiado e não pode criar desafio", () => {
    const info = getCurrentFortnightInfo(new Date(2026, 0, 20));
    expect(info.role).toBe("challenged");
    expect(info.canCreateChallenge).toBe(false);
    expect(info.quinzenaLabel).toContain("2ª quinzena");
  });

  it("alterna o papel na próxima quinzena", () => {
    const first = getCurrentFortnightInfo(new Date(2026, 0, 5));
    expect(first.nextRole).toBe("challenged");
    expect(first.nextQuinzenaLabel).toContain("2ª quinzena");

    const second = getCurrentFortnightInfo(new Date(2026, 0, 20));
    expect(second.nextRole).toBe("challenger");
    expect(second.nextQuinzenaLabel).toContain("1ª quinzena");
  });
});

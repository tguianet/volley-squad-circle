import { describe, expect, it } from "vitest";
import {
  canChallengeTeam,
  getChallengeEligibilityBadge,
  isTeamComplete,
  isUserTeamCaptain,
  requiredMembersForCategory,
} from "@/lib/challenge-rules";

describe("isUserTeamCaptain", () => {
  it("reconhece o capitão", () => {
    expect(isUserTeamCaptain({ captain_id: "u1" }, "u1")).toBe(true);
  });

  it("nega outro usuário ou usuário anônimo", () => {
    expect(isUserTeamCaptain({ captain_id: "u1" }, "u2")).toBe(false);
    expect(isUserTeamCaptain({ captain_id: "u1" }, null)).toBe(false);
    expect(isUserTeamCaptain({ captain_id: "u1" }, undefined)).toBe(false);
  });
});

describe("isTeamComplete / requiredMembersForCategory", () => {
  it("dupla exige 2 membros", () => {
    expect(requiredMembersForCategory("dupla")).toBe(2);
    expect(isTeamComplete("dupla", 1)).toBe(false);
    expect(isTeamComplete("dupla", 2)).toBe(true);
    expect(isTeamComplete("dupla", 3)).toBe(false);
  });

  it("quarteto exige 4 membros", () => {
    expect(requiredMembersForCategory("quarteto")).toBe(4);
    expect(isTeamComplete("quarteto", 3)).toBe(false);
    expect(isTeamComplete("quarteto", 4)).toBe(true);
  });
});

describe("canChallengeTeam", () => {
  it("não permite desafiar o próprio time/posição", () => {
    expect(canChallengeTeam(7, 7)).toBe(false);
  });

  it("libera qualquer confronto dentro do top 5", () => {
    expect(canChallengeTeam(1, 5)).toBe(true);
    expect(canChallengeTeam(5, 1)).toBe(true);
    expect(canChallengeTeam(2, 4)).toBe(true);
  });

  it("permite até 3 posições acima e 2 abaixo fora do top 5", () => {
    expect(canChallengeTeam(10, 7)).toBe(true);
    expect(canChallengeTeam(10, 12)).toBe(true);
  });

  it("bloqueia fora da janela permitida", () => {
    expect(canChallengeTeam(10, 6)).toBe(false);
    expect(canChallengeTeam(10, 13)).toBe(false);
  });
});

describe("getChallengeEligibilityBadge", () => {
  it("retorna null quando o desafio é inválido", () => {
    expect(getChallengeEligibilityBadge(10, 20)).toBeNull();
  });

  it("marca confrontos internos do top 5", () => {
    expect(getChallengeEligibilityBadge(2, 5)).toBe("top5");
  });

  it("diferencia adversário acima e abaixo", () => {
    expect(getChallengeEligibilityBadge(10, 8)).toBe("above");
    expect(getChallengeEligibilityBadge(10, 11)).toBe("below");
  });
});

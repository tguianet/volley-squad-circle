import { describe, expect, it } from "vitest";
import { getSocialTeamOptions, requiredConfirmedPlayers } from "@/lib/social-team";

describe("social team formation", () => {
  it("allows a male captain to invite a female player only to mixed teams", () => {
    expect(getSocialTeamOptions("M", "F").map((option) => option.label)).toEqual([
      "Dupla mista",
      "Quarteto misto",
    ]);
  });

  it("does not offer a mixed pair to players of the same gender", () => {
    expect(getSocialTeamOptions("F", "F").map((option) => option.label)).toEqual([
      "Dupla feminina",
      "Quarteto feminino",
      "Quarteto misto",
    ]);
  });

  it("requires the correct confirmed roster size", () => {
    expect(requiredConfirmedPlayers("dupla")).toBe(2);
    expect(requiredConfirmedPlayers("quarteto")).toBe(4);
  });
});

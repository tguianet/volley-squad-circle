import { describe, expect, it } from "vitest";
import {
  hourlyStartsWithinWindow,
  validateCommonAvailability,
  validateRescheduleSelection,
} from "@/lib/challenge-scheduling";

describe("challenge scheduling", () => {
  it("keeps one-hour starts inside the common window", () => {
    expect(hourlyStartsWithinWindow("09:30", "13:30")).toEqual(["10:00", "11:00", "12:00"]);
  });

  it("limits challenges to the official 08:00-17:00 window", () => {
    expect(hourlyStartsWithinWindow("06:00", "20:00")).toEqual([
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
    ]);
  });

  it("requires Sunday, a shared arena and an overlapping window", () => {
    expect(
      validateCommonAvailability({
        sundayDate: "2026-08-16",
        start: "10:00",
        end: "12:00",
        challengerArenaId: "arena-a",
        challengedArenaId: "arena-a",
      }),
    ).toBeNull();
    expect(
      validateCommonAvailability({
        sundayDate: "2026-08-17",
        start: "10:00",
        end: "12:00",
        challengerArenaId: "arena-a",
        challengedArenaId: "arena-b",
      }),
    ).toBe("Desafios só podem ocorrer aos domingos.");
  });

  it("requires a complete Sunday counterproposal", () => {
    expect(
      validateRescheduleSelection({
        date: "2026-08-16",
        time: "10:00",
        arenaId: "arena-a",
        courtId: "court-a",
        reason: "Novo horário comum",
      }),
    ).toBeNull();
    expect(
      validateRescheduleSelection({
        date: "2026-08-17",
        time: "10:00",
        arenaId: "arena-a",
        courtId: "court-a",
        reason: "Novo horário comum",
      }),
    ).toBe("Selecione um domingo compatível.");
  });
});

import { describe, expect, it } from "vitest";
import { firstDayOfMonth, isSundayISO, validateAvailabilityInput } from "./team-availability";

describe("team availability", () => {
  it("identifies only valid Sundays", () => {
    expect(isSundayISO("2026-08-02")).toBe(true);
    expect(isSundayISO("2026-08-03")).toBe(false);
    expect(isSundayISO("2026-02-30")).toBe(false);
  });

  it("returns the local first day of the month", () => {
    expect(firstDayOfMonth(new Date(2026, 7, 11))).toBe("2026-08-01");
  });

  it("requires time range and arena for an available Sunday", () => {
    expect(validateAvailabilityInput({ sundayDate: "2026-08-02", isAvailable: true })).toBe(
      "Informe o horário inicial e final.",
    );
    expect(
      validateAvailabilityInput({
        sundayDate: "2026-08-02",
        isAvailable: true,
        timeStart: "10:00",
        timeEnd: "09:00",
        arenaId: "arena",
      }),
    ).toBe("O horário final deve ser depois do inicial.");
  });

  it("accepts a complete Sunday availability and clearing a Sunday", () => {
    expect(
      validateAvailabilityInput({
        sundayDate: "2026-08-02",
        isAvailable: true,
        timeStart: "09:00",
        timeEnd: "12:00",
        arenaId: "arena",
      }),
    ).toBeNull();
    expect(validateAvailabilityInput({ sundayDate: "2026-08-02", isAvailable: false })).toBeNull();
  });
});

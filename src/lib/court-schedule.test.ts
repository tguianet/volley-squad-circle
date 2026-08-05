import { describe, expect, it } from "vitest";
import { addOneHourToTime, nextRankingSundays } from "@/lib/court-schedule";

describe("addOneHourToTime", () => {
  it("soma uma hora mantendo os minutos", () => {
    expect(addOneHourToTime("08:00:00")).toBe("09:00:00");
    expect(addOneHourToTime("08:30")).toBe("09:30:00");
  });
});

describe("nextRankingSundays", () => {
  it("retorna a quantidade pedida de domingos futuros", () => {
    const sundays = nextRankingSundays(6);
    expect(sundays).toHaveLength(6);
    for (const s of sundays) {
      expect(s.iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(`${s.iso}T12:00:00`).getDay()).toBe(0);
    }
  });

  it("está em ordem crescente e com espaçamento de 7 dias", () => {
    const sundays = nextRankingSundays(4);
    for (let i = 1; i < sundays.length; i++) {
      const prev = new Date(`${sundays[i - 1].iso}T12:00:00`).getTime();
      const curr = new Date(`${sundays[i].iso}T12:00:00`).getTime();
      expect(curr - prev).toBe(7 * 86_400_000);
    }
  });

  it("nunca inclui hoje quando hoje é domingo", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(nextRankingSundays(1)[0].iso).not.toBe(today);
  });
});

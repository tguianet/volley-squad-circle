import { describe, expect, it } from "vitest";
import {
  formatDateBR,
  formatRelativeTimeBR,
  formatSundayLong,
  formatTimeHM,
  formatTimeSlotLabel,
  formatWeekdayBR,
} from "@/lib/date-format";

describe("formatDateBR", () => {
  it("converte data ISO simples sem deslocar fuso", () => {
    expect(formatDateBR("2026-03-08")).toBe("08/03/2026");
  });

  it("retorna travessão para valor inválido", () => {
    expect(formatDateBR("não-é-data")).toBe("—");
  });
});

describe("formatTimeHM / formatTimeSlotLabel", () => {
  it("corta os segundos", () => {
    expect(formatTimeHM("08:30:00")).toBe("08:30");
    expect(formatTimeSlotLabel("08:00:00", "09:00:00")).toBe("08:00 - 09:00");
  });
});

describe("formatWeekdayBR / formatSundayLong", () => {
  it("capitaliza o dia da semana", () => {
    expect(formatWeekdayBR("2026-03-08")).toBe("Domingo");
    expect(formatSundayLong("2026-03-08")).toMatch(/^Domingo, 08 de março de 2026$/);
  });

  it("retorna travessão para valor inválido", () => {
    expect(formatWeekdayBR("xx")).toBe("—");
    expect(formatSundayLong("xx")).toBe("—");
  });
});

describe("formatRelativeTimeBR", () => {
  const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

  it("usa rótulos relativos curtos", () => {
    expect(formatRelativeTimeBR(iso(10_000))).toBe("agora");
    expect(formatRelativeTimeBR(iso(5 * 60_000))).toBe("há 5 min");
    expect(formatRelativeTimeBR(iso(3 * 3_600_000))).toBe("há 3h");
    expect(formatRelativeTimeBR(iso(2 * 86_400_000))).toBe("há 2d");
  });

  it("cai para data absoluta após 7 dias", () => {
    expect(formatRelativeTimeBR(iso(10 * 86_400_000))).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

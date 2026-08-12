import { isSundayISO } from "@/lib/team-availability";

export type AvailabilityWindow = {
  sundayDate: string;
  start: string;
  end: string;
  challengerArenaId: string | null;
  challengedArenaId: string | null;
};

export function validateCommonAvailability(window: AvailabilityWindow): string | null {
  if (!isSundayISO(window.sundayDate)) return "Desafios só podem ocorrer aos domingos.";
  if (!window.challengerArenaId || window.challengerArenaId !== window.challengedArenaId) {
    return "As equipes precisam escolher a mesma arena.";
  }
  if (window.start >= window.end) return "As equipes não possuem um horário em comum.";
  return null;
}

export function hourlyStartsWithinWindow(start: string, end: string): string[] {
  const [startHour, startMinute] = start.slice(0, 5).split(":").map(Number);
  const [endHour, endMinute] = end.slice(0, 5).split(":").map(Number);
  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) return [];

  const firstStartMinutes = Math.max(startHour * 60 + startMinute, 8 * 60);
  const endMinutes = Math.min(endHour * 60 + endMinute, 17 * 60);
  const firstHour = Math.ceil(firstStartMinutes / 60);
  const result: string[] = [];
  for (let minutes = firstHour * 60; minutes + 60 <= endMinutes; minutes += 60) {
    result.push(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:00`);
  }
  return result;
}

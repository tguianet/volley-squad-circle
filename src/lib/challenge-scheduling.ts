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

export function validateRescheduleSelection(input: {
  date: string;
  time: string;
  arenaId: string;
  courtId: string;
  reason: string;
}): string | null {
  if (!isSundayISO(input.date)) return "Selecione um domingo compatível.";
  if (!input.time || !input.arenaId || !input.courtId) return "Selecione horário e quadra.";
  if (input.reason.trim().length < 3) return "Informe o motivo do reagendamento.";
  return null;
}

export function hasChallengeStarted(
  scheduledDate: string | null,
  scheduledTime: string | null,
  now = new Date(),
): boolean {
  if (!scheduledDate || !scheduledTime) return false;
  const startsAt = new Date(`${scheduledDate}T${scheduledTime.slice(0, 8)}-03:00`);
  return Number.isFinite(startsAt.getTime()) && startsAt.getTime() <= now.getTime();
}

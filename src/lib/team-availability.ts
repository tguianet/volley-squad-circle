export type TeamAvailabilityInput = {
  sundayDate: string;
  isAvailable: boolean;
  timeStart?: string | null;
  timeEnd?: string | null;
  arenaId?: string | null;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export function firstDayOfMonth(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function isSundayISO(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCDay() === 0
  );
}

export function validateAvailabilityInput(input: TeamAvailabilityInput): string | null {
  if (!isSundayISO(input.sundayDate))
    return "A disponibilidade só pode ser cadastrada aos domingos.";
  if (!input.isAvailable) return null;
  if (!input.timeStart || !input.timeEnd) return "Informe o horário inicial e final.";
  if (!TIME.test(input.timeStart) || !TIME.test(input.timeEnd)) return "Informe horários válidos.";
  if (input.timeStart >= input.timeEnd) return "O horário final deve ser depois do inicial.";
  if (!input.arenaId) return "Selecione uma arena.";
  return null;
}

export function formatSundayLabel(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad2 = (value: number) => String(value).padStart(2, "0");

export function formatDateBR(value: string) {
  const dateOnly = DATE_ONLY_RE.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatRelativeTimeBR(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days}d`;
  return formatDateBR(value);
}

export function formatSundayLong(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${date}`;
}

export function formatWeekdayBR(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

export function formatTimeHM(value: string) {
  return value.slice(0, 5);
}

export function formatTimeSlotLabel(start: string, end: string) {
  return `${formatTimeHM(start)} - ${formatTimeHM(end)}`;
}

export function formatDateTimeBR(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("day")}/${get("month")}/${get("year")} ${pad2(Number(get("hour")))}:${get("minute")}`;
}

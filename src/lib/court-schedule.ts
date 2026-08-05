const MONTHS_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export type CourtSlot = {
  court_id: string;
  court_number: number;
  court_name: string;
  slot_time: string;
  is_free: boolean;
};

export function nextRankingSundays(count = 6): Array<{ iso: string; day: string; month: string }> {
  const out: Array<{ iso: string; day: string; month: string }> = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  const offset = (7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + offset);
  for (let i = 0; i < count; i++) {
    out.push({
      iso: d.toISOString().slice(0, 10),
      day: String(d.getDate()).padStart(2, "0"),
      month: MONTHS_SHORT[d.getMonth()],
    });
    d.setDate(d.getDate() + 7);
  }
  return out;
}

export function addOneHourToTime(time: string): string {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  const nextH = h + 1;
  return `${String(nextH).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}:00`;
}

export function formatMatchDateLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const target = new Date(`${iso}T12:00:00`);
  if (target.toDateString() === today.toDateString()) {
    return `Hoje, ${d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`;
  }
  if (target.toDateString() === tomorrow.toDateString()) {
    return `Amanhã, ${d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`;
  }
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "long" });
}

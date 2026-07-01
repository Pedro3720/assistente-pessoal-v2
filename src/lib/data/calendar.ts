import { createClient } from "@/lib/supabase/server";
import { monthBounds, spDateParts } from "@/lib/dates";
import type { CalendarEvent } from "@/types/calendar";

export interface EventOccurrence {
  event: CalendarEvent;
  date: string; // 'YYYY-MM-DD' (data local SP desta ocorrência)
  time: string; // 'HH:mm'
  key: string;
}

function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function eachDayOfMonth(year: number, month: number): string[] {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days: string[] = [];
  for (let d = 1; d <= last; d++) {
    days.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return days;
}

/**
 * Ocorrências de eventos dentro de um mês, já expandindo recorrências
 * (diária/semanal/mensal). Eventos são guardados uma vez; as instâncias
 * são geradas em memória — nada é duplicado no banco.
 */
export async function getEventsForMonth(year: number, month: number): Promise<EventOccurrence[]> {
  const supabase = await createClient();
  const { start, end } = monthBounds(year, month);
  const endInstant = `${end}T23:59:59-03:00`;

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .lte("starts_at", endInstant) // criados até o fim do mês visualizado
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);

  const events = (data ?? []) as CalendarEvent[];
  const monthDays = eachDayOfMonth(year, month);
  const occ: EventOccurrence[] = [];

  for (const ev of events) {
    const { date: evDate, time } = spDateParts(ev.starts_at);
    const push = (date: string) => occ.push({ event: ev, date, time, key: `${ev.id}-${date}` });

    if (ev.repeat === "none") {
      if (evDate >= start && evDate <= end) push(evDate);
    } else if (ev.repeat === "daily") {
      for (const d of monthDays) if (d >= evDate) push(d);
    } else if (ev.repeat === "weekly") {
      const wd = weekdayOf(evDate);
      for (const d of monthDays) if (d >= evDate && weekdayOf(d) === wd) push(d);
    } else if (ev.repeat === "monthly") {
      const day = Number(evDate.split("-")[2]);
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const target = `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
      if (target >= evDate) push(target);
    }
  }

  occ.sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
  return occ;
}

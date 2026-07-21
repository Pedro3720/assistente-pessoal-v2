import type { SupabaseClient } from "@supabase/supabase-js";
import { composeSP, spDateParts, todayISO } from "@/lib/dates";
import type { EventRepeat } from "@/types/calendar";

export interface DueReminder {
  user_id: string;
  kind: "event" | "task";
  ref_id: number;
  occurred_on: string; // YYYY-MM-DD (SP)
  title: string;
  body: string;
  url: string;
  tag: string;
}

function shiftDay(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function lastDayOfMonth(dateStr: string): number {
  const [y, m] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Uma ocorrência do evento acontece na data D? (mesma regra do getEventsForMonth) */
function occursOn(repeat: EventRepeat, baseDate: string, D: string): boolean {
  if (D < baseDate) return false;
  if (repeat === "none") return D === baseDate;
  if (repeat === "daily") return true;
  if (repeat === "weekly") return weekdayOf(D) === weekdayOf(baseDate);
  if (repeat === "monthly") {
    const baseDay = Number(baseDate.split("-")[2]);
    return Number(D.split("-")[2]) === Math.min(baseDay, lastDayOfMonth(D));
  }
  return false;
}

type EventRow = {
  id: number;
  user_id: string;
  title: string;
  starts_at: string;
  repeat: EventRepeat;
  reminder_minutes: number | null;
};
type TaskRow = { id: number; user_id: string; title: string; due_on: string | null };

/**
 * Lembretes cujo instante de disparo caiu na janela (now-90s, now].
 * Recebe o client admin (service role) para ler de todos os usuários.
 *  - Evento: dispara em starts_at (da ocorrência) - reminder_minutes.
 *  - Tarefa pendente com due_on = hoje: dispara às 08:00 (SP).
 */
export async function getDueReminders(admin: SupabaseClient, now: Date): Promise<DueReminder[]> {
  const windowStart = now.getTime() - 90_000;
  const inWindow = (t: number) => t > windowStart && t <= now.getTime();
  const today = todayISO();
  const dates = [shiftDay(today, -1), today, shiftDay(today, 1)];
  const out: DueReminder[] = [];

  // ── Eventos ──
  const { data: evData, error: evErr } = await admin
    .from("events")
    .select("id, user_id, title, starts_at, repeat, reminder_minutes")
    .not("reminder_minutes", "is", null);
  if (evErr) throw new Error(evErr.message);

  for (const ev of (evData ?? []) as EventRow[]) {
    if (ev.reminder_minutes == null) continue;
    const { date: baseDate, time } = spDateParts(ev.starts_at);
    for (const D of dates) {
      if (!occursOn(ev.repeat, baseDate, D)) continue;
      const start = new Date(composeSP(D, time)).getTime();
      const fireAt = start - ev.reminder_minutes * 60_000;
      if (inWindow(fireAt)) {
        out.push({
          user_id: ev.user_id,
          kind: "event",
          ref_id: ev.id,
          occurred_on: D,
          title: ev.title,
          body: `Começa às ${time}`,
          url: "/calendario",
          tag: `event-${ev.id}-${D}`,
        });
      }
    }
  }

  // ── Tarefas (vencem hoje; disparam às 08:00 SP) ──
  const taskFire = new Date(composeSP(today, "08:00")).getTime();
  if (inWindow(taskFire)) {
    const { data: tkData, error: tkErr } = await admin
      .from("tasks")
      .select("id, user_id, title, due_on")
      .neq("status", "completed")
      .eq("due_on", today);
    if (tkErr) throw new Error(tkErr.message);
    for (const t of (tkData ?? []) as TaskRow[]) {
      if (!t.due_on) continue;
      out.push({
        user_id: t.user_id,
        kind: "task",
        ref_id: t.id,
        occurred_on: t.due_on,
        title: "Tarefa vence hoje",
        body: t.title,
        url: "/tarefas",
        tag: `task-${t.id}-${t.due_on}`,
      });
    }
  }

  return out;
}

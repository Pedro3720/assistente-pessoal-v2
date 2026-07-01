import { getFinanceData } from "@/lib/data/finance";
import { getEventsForMonth, type EventOccurrence } from "@/lib/data/calendar";
import { getTasks } from "@/lib/data/task";
import { currentYearMonth, shiftMonth, todayISO } from "@/lib/dates";
import type { Task, TaskPriority } from "@/types/task";

function currentWeekDays(today: string) {
  const [y, m, d] = today.split("-").map(Number);
  const base = Date.UTC(y, m - 1, d);
  const wd = new Date(base).getUTCDay(); // 0 = domingo
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(base + (i - wd) * 86400000);
    out.push(
      `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`
    );
  }
  return out;
}

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

export async function getDashboardData() {
  const { year, month } = currentYearMonth();
  const next = shiftMonth(year, month, 1);

  const [finance, occThis, occNext, tasks] = await Promise.all([
    getFinanceData(year, month),
    getEventsForMonth(year, month),
    getEventsForMonth(next.year, next.month),
    getTasks(),
  ]);

  const today = todayISO();
  const occ: EventOccurrence[] = [...occThis, ...occNext];

  const eventsTodayCount = occ.filter((o) => o.date === today).length;

  const upcoming = occ
    .filter((o) => o.date >= today)
    .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)))
    .slice(0, 5);

  const eventDates = new Set(occ.map((o) => o.date));
  const week = currentWeekDays(today).map((date) => ({
    date,
    day: Number(date.split("-")[2]),
    isToday: date === today,
    hasEvents: eventDates.has(date),
  }));

  const pending = tasks.filter((t) => t.status !== "completed");
  const topTasks: Task[] = [...pending]
    .sort((a, b) => {
      if (a.due_on && b.due_on) return a.due_on.localeCompare(b.due_on);
      if (a.due_on) return -1;
      if (b.due_on) return 1;
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    })
    .slice(0, 5);

  return {
    today,
    finance: {
      balance: finance.totals.balance,
      income: finance.totals.income,
      expense: finance.totals.expense,
      invoices: finance.cards.reduce((s, c) => s + c.invoice, 0),
    },
    eventsTodayCount,
    upcoming,
    week,
    pendingCount: pending.length,
    topTasks,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

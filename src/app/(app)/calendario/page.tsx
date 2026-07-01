import { getEventsForMonth, type EventOccurrence } from "@/lib/data/calendar";
import { currentYearMonth, shiftMonth } from "@/lib/dates";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const offset = Number(m) || 0;

  const { year: cy, month: cm } = currentYearMonth();
  const { year, month } = shiftMonth(cy, cm, offset);

  let occurrences: EventOccurrence[];
  try {
    occurrences = await getEventsForMonth(year, month);
  } catch (e) {
    return <CalendarLoadError message={e instanceof Error ? e.message : "Erro desconhecido"} />;
  }

  return <CalendarView occurrences={occurrences} year={year} month={month} offset={offset} />;
}

function CalendarLoadError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-extrabold leading-none tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
        Calendário
      </h1>
      <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="font-semibold">Não foi possível carregar os eventos.</p>
        <p className="mt-1 font-mono text-xs text-amber-800">{message}</p>
        <p className="mt-3">
          Se a tabela ainda não existe, rode{" "}
          <code className="rounded bg-amber-100 px-1">supabase/migrations/20260701000001_calendar.sql</code>{" "}
          no SQL Editor do Supabase e recarregue.
        </p>
      </div>
    </div>
  );
}

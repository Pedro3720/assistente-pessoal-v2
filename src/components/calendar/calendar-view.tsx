"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Plus, Search, Clock, Repeat,
  Edit3, Trash2, X, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { deleteEvent } from "@/lib/actions/calendar";
import { todayISO, formatDateBR } from "@/lib/dates";
import {
  EVENT_CATEGORIES, REPEAT_OPTIONS, MONTH_NAMES, WEEKDAY_SHORT,
} from "@/lib/calendar/constants";
import { EventModal } from "./event-modal";
import { GoogleConnectButton } from "./google-connect-button";
import { GoogleImportButton } from "./google-import-button";
import type { CalendarEvent } from "@/types/calendar";
import type { EventOccurrence } from "@/lib/data/calendar";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function CalendarView({
  occurrences,
  year,
  month,
  offset,
  google,
}: {
  occurrences: EventOccurrence[];
  year: number;
  month: number;
  offset: number;
  google: { connected: boolean; email: string | null };
}) {
  const router = useRouter();
  const today = todayISO();

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [presetDate, setPresetDate] = useState<string | null>(null);
  const [dayPopup, setDayPopup] = useState<{ date: string; items: EventOccurrence[] } | null>(null);
  const [viewing, setViewing] = useState<EventOccurrence | null>(null);

  const goMonth = (o: number) => router.push(`/calendario?m=${o}`);

  const filtered = useMemo(() => {
    let list = occurrences;
    if (catFilter) list = list.filter((o) => o.event.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.event.title.toLowerCase().includes(q) ||
          (o.event.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [occurrences, catFilter, search]);

  const byDate = useMemo(() => {
    const m = new Map<string, EventOccurrence[]>();
    for (const o of filtered) {
      const a = m.get(o.date) ?? [];
      a.push(o);
      m.set(o.date, a);
    }
    return m;
  }, [filtered]);

  const sortedDates = useMemo(() => [...byDate.keys()].sort(), [byDate]);
  // Agenda lateral: só datas de hoje em diante (eventos passados ficam só no grid).
  const agendaDates = useMemo(() => sortedDates.filter((d) => d >= today), [sortedDates, today]);

  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  function openNew(date?: string) {
    setEditing(null);
    setPresetDate(date ?? null);
    setModalOpen(true);
  }
  function openEdit(ev: CalendarEvent) {
    setViewing(null);
    setEditing(ev);
    setPresetDate(null);
    setModalOpen(true);
  }
  async function remove(id: number) {
    if (!confirm("Excluir este evento?")) return;
    try {
      await deleteEvent(id);
      setViewing(null);
      setDayPopup(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }
  function clickDay(dateStr: string) {
    const items = byDate.get(dateStr) ?? [];
    if (items.length) setDayPopup({ date: dateStr, items });
    else openNew(dateStr);
  }

  const repeatLabel = (v: string) => REPEAT_OPTIONS.find((r) => r.value === v)?.label;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-gradient text-4xl font-bold leading-none tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
            Calendário
          </h1>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={() => goMonth(offset - 1)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-accent">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[10rem] text-center text-sm font-medium">
              {MONTH_NAMES[month - 1]} / {year}
            </span>
            <button onClick={() => goMonth(offset + 1)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-accent">
              <ChevronRight className="h-4 w-4" />
            </button>
            {offset !== 0 && (
              <button onClick={() => goMonth(0)} className="ml-1 text-xs text-primary hover:underline">
                Mês atual
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GoogleConnectButton connected={google.connected} email={google.email} />
          {google.connected && <GoogleImportButton year={year} month={month} />}
          <button
            onClick={() => openNew()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Novo Evento
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar eventos..."
          className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary/50"
        />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Grade */}
        <div className="glass card-glow flex-1 rounded-2xl border border-border p-6">
          <div className="mb-2 grid grid-cols-7 gap-1">
            {WEEKDAY_SHORT.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`e-${i}`} className="min-h-[90px]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${pad(month)}-${pad(day)}`;
              const dayEvents = byDate.get(dateStr) ?? [];
              const isToday = dateStr === today;
              return (
                <button
                  key={day}
                  onClick={() => clickDay(dateStr)}
                  className={`min-h-[90px] cursor-pointer rounded-lg border p-1.5 text-left transition-all hover:border-primary/50 ${
                    isToday ? "border-primary/50 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${isToday ? "text-primary" : "text-foreground"}`}>{day}</span>
                    {dayEvents.length > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{dayEvents.length}</span>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((o) => (
                      <div
                        key={o.key}
                        onClick={(e) => { e.stopPropagation(); setViewing(o); }}
                        className="truncate rounded px-1 py-0.5 text-[10px] text-white"
                        style={{ backgroundColor: o.event.color }}
                      >
                        {o.time} {o.event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] font-medium text-primary">+{dayEvents.length - 2}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Agenda lateral */}
        <div className="w-full shrink-0 lg:w-80">
          <div className="glass card-glow rounded-2xl border border-border p-5">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Agenda do mês</h2>
            </div>
            <div className="mb-4 flex flex-wrap gap-1.5 border-b border-border pb-4">
              <button
                onClick={() => setCatFilter(null)}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${!catFilter ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:bg-accent/80"}`}
              >
                Todas
              </button>
              {EVENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => setCatFilter(catFilter === cat.label ? null : cat.label)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors ${catFilter === cat.label ? "text-white" : "bg-accent text-muted-foreground hover:bg-accent/80"}`}
                  style={catFilter === cat.label ? { backgroundColor: cat.color } : {}}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.label}
                </button>
              ))}
            </div>
            {agendaDates.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {search || catFilter
                  ? "Nenhum evento encontrado."
                  : sortedDates.length > 0
                    ? "Os eventos deste mês já passaram."
                    : "Nenhum evento neste mês."}
              </p>
            ) : (
              <div className="max-h-[500px] space-y-4 overflow-y-auto">
                {agendaDates.map((dateStr) => (
                  <div key={dateStr}>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">{formatDateBR(dateStr)}</p>
                    {byDate.get(dateStr)!.map((o) => (
                      <button
                        key={o.key}
                        onClick={() => setViewing(o)}
                        className="w-full rounded-lg p-2.5 text-left transition-colors hover:bg-accent"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: o.event.color }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{o.event.title}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {o.time}
                              {o.event.repeat !== "none" && <span className="ml-1 uppercase opacity-60">• {repeatLabel(o.event.repeat)}</span>}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Popup: eventos do dia */}
      {dayPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" >
          <div className="absolute inset-0 bg-black/60" onClick={() => setDayPopup(null)} />
          <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold">{formatDateBR(dayPopup.date)}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { const d = dayPopup.date; setDayPopup(null); openNew(d); }}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-3 w-3" /> Novo
                </button>
                <button onClick={() => setDayPopup(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="max-h-[400px] space-y-2 overflow-y-auto p-4">
              {dayPopup.items.map((o) => (
                <button
                  key={o.key}
                  onClick={() => { setDayPopup(null); setViewing(o); }}
                  className="w-full rounded-xl border border-border bg-muted p-3.5 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: o.event.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{o.event.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {o.time}
                        {o.event.category ? ` · ${o.event.category}` : ""}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Popup: detalhe do evento */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setViewing(null)} />
          <div className="relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <button onClick={() => setViewing(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(viewing.event)} className="p-1 text-muted-foreground hover:text-primary" title="Editar">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button onClick={() => remove(viewing.event.id)} className="p-1 text-muted-foreground hover:text-red-500" title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: viewing.event.color }} />
                <h2 className="text-lg font-semibold">{viewing.event.title}</h2>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{formatDateBR(viewing.date)} às {viewing.time}</span>
                </div>
                {viewing.event.category && (
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: viewing.event.color }} />
                    <span>{viewing.event.category}</span>
                  </div>
                )}
                {viewing.event.repeat !== "none" && (
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    <span>{repeatLabel(viewing.event.repeat)}</span>
                  </div>
                )}
                {viewing.event.description && (
                  <div className="border-t border-border pt-2 text-foreground">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Descrição</p>
                    <p className="text-sm">{viewing.event.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <EventModal
          editing={editing}
          presetDate={presetDate}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

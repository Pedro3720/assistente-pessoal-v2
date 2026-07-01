"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { createEvent, updateEvent } from "@/lib/actions/calendar";
import { composeSP, spDateParts, todayISO } from "@/lib/dates";
import { EVENT_CATEGORIES, REPEAT_OPTIONS, REMINDER_OPTIONS } from "@/lib/calendar/constants";
import type { CalendarEvent, EventRepeat } from "@/types/calendar";

export function EventModal({
  editing,
  presetDate,
  onClose,
}: {
  editing: CalendarEvent | null;
  presetDate: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const start = editing ? spDateParts(editing.starts_at) : { date: presetDate ?? todayISO(), time: "12:00" };
  const end = editing?.ends_at ? spDateParts(editing.ends_at) : { date: start.date, time: "13:00" };

  const [title, setTitle] = useState(editing?.title ?? "");
  const [category, setCategory] = useState(editing?.category ?? "Trabalho");
  const [color, setColor] = useState(editing?.color ?? "#3b82f6");
  const [startDate, setStartDate] = useState(start.date);
  const [startTime, setStartTime] = useState(start.time);
  const [endDate, setEndDate] = useState(end.date);
  const [endTime, setEndTime] = useState(end.time);
  const [repeat, setRepeat] = useState<EventRepeat>(editing?.repeat ?? "none");
  const [reminder, setReminder] = useState<number | null>(editing?.reminder_minutes ?? 15);
  const [description, setDescription] = useState(editing?.description ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) {
      toast.error("O título é obrigatório.");
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      starts_at: composeSP(startDate, startTime),
      ends_at: composeSP(endDate, endTime),
      all_day: false,
      color,
      category,
      repeat,
      reminder_minutes: reminder,
    };
    try {
      if (editing) await updateEvent(editing.id, payload);
      else await createEvent(payload);
      router.refresh();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={save}
            disabled={saving || !title.trim()}
            className="rounded-lg bg-primary px-5 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Salvando..." : editing ? "Atualizar" : "Salvar"}
          </button>
        </div>

        <div className="space-y-5 p-5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome do evento"
            autoFocus
            className="w-full border-b border-transparent bg-transparent pb-2 text-xl font-semibold outline-none placeholder:text-muted-foreground focus:border-primary/60"
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Categoria</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => {
                    setCategory(cat.label);
                    setColor(cat.color);
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    category === cat.label ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Início</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm" />
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fim</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm" />
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Repetir</label>
            <div className="flex flex-wrap gap-2">
              {REPEAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRepeat(opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    repeat === opt.value ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Lembrete</label>
            <select
              value={reminder === null ? "" : String(reminder)}
              onChange={(e) => setReminder(e.target.value === "" ? null : Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            >
              {REMINDER_OPTIONS.map((opt) => (
                <option key={String(opt.value)} value={opt.value === null ? "" : String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Adicione uma descrição..."
              className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-2 text-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit3, Trash2, Check, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { deleteTask, setTaskStatus } from "@/lib/actions/task";
import { STATUS_META, PRIORITY_META } from "@/lib/tasks/constants";
import { todayISO, formatDateBR } from "@/lib/dates";
import { TaskModal } from "./task-modal";
import type { Task, TaskStatus } from "@/types/task";

type Filter = "all" | TaskStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluídas" },
];

export function TasksView({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const today = todayISO();
  const [filter, setFilter] = useState<Filter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
    }),
    [tasks]
  );

  const shown = useMemo(
    () => (filter === "all" ? tasks : tasks.filter((t) => t.status === filter)),
    [tasks, filter]
  );

  async function toggle(t: Task) {
    const next: TaskStatus = t.status === "completed" ? "pending" : "completed";
    try {
      await setTaskStatus(t.id, next);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar");
    }
  }

  async function remove(id: number) {
    if (!confirm("Excluir esta tarefa?")) return;
    try {
      await deleteTask(id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold leading-none tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
            Tarefas
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Organize o que precisa ser feito</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nova Tarefa
        </button>
      </div>

      {/* filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.value ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:bg-accent/80"
            }`}
          >
            {f.label} <span className="opacity-60">({counts[f.value]})</span>
          </button>
        ))}
      </div>

      {/* lista */}
      <div className="space-y-2">
        {shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-card py-16 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma tarefa aqui.</p>
          </div>
        ) : (
          shown.map((t) => {
            const done = t.status === "completed";
            const overdue = t.due_on && !done && t.due_on < today;
            return (
              <div key={t.id} className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow">
                <button
                  onClick={() => toggle(t)}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40 hover:border-primary"
                  }`}
                  title={done ? "Reabrir" : "Concluir"}
                >
                  {done && <Check className="h-3 w-3" />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: PRIORITY_META[t.priority].dot }} title={`Prioridade ${PRIORITY_META[t.priority].label}`} />
                    <h3 className={`truncate text-sm font-medium ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {t.title}
                    </h3>
                  </div>
                  {t.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_META[t.status].color}`}>
                      {STATUS_META[t.status].label}
                    </span>
                    <span className={`text-[11px] font-medium ${PRIORITY_META[t.priority].text}`}>
                      {PRIORITY_META[t.priority].label}
                    </span>
                    {t.due_on && (
                      <span className={`flex items-center gap-1 text-[11px] ${overdue ? "font-medium text-red-600" : "text-muted-foreground"}`}>
                        <CalendarClock className="h-3 w-3" />
                        {formatDateBR(t.due_on)}
                        {overdue ? " · atrasada" : ""}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => { setEditing(t); setModalOpen(true); }} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(t.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {modalOpen && <TaskModal editing={editing} onClose={() => setModalOpen(false)} />}
    </div>
  );
}

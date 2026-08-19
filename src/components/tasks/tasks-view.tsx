"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Edit3, Trash2, Check, CalendarClock, GripVertical, Tags, Bell } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { deleteTask, setTaskStatus, reorderTasks } from "@/lib/actions/task";
import { reorderWithinFilter } from "@/lib/tasks/reorder";
import { STATUS_META, PRIORITY_META, reminderLabel } from "@/lib/tasks/constants";
import { todayISO, formatDateBR, formatTimeBR } from "@/lib/dates";
import { TaskModal } from "./task-modal";
import { TaskCategoryManager } from "./task-category-manager";
import { Reveal } from "@/components/effects/reveal";
import { EmptyState } from "@/components/effects/empty-state";
import type { Task, TaskCategory, TaskStatus } from "@/types/task";

type Filter = "all" | TaskStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluídas" },
];

export function TasksView({ tasks, categories }: { tasks: Task[]; categories: TaskCategory[] }) {
  const router = useRouter();
  const today = todayISO();
  const [filter, setFilter] = useState<Filter>("all");
  const [catFilter, setCatFilter] = useState<number | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [order, setOrder] = useState<Task[]>(tasks);
  // ressincroniza a ordem local quando o servidor devolve outra lista (após refresh)
  const orderKey = tasks.map((t) => t.id).join(",");
  useEffect(() => setOrder(tasks), [orderKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setModalOpen(true);
      router.replace("/tarefas");
    }
  }, [searchParams, router]);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
    }),
    [tasks]
  );

  const shown = useMemo(() => {
    let list = filter === "all" ? order : order.filter((t) => t.status === filter);
    if (catFilter !== "all") list = list.filter((t) => t.category_id === catFilter);
    return list;
  }, [order, filter, catFilter]);

  async function toggle(t: Task) {
    const next: TaskStatus = t.status === "completed" ? "pending" : "completed";
    setOrder((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: next } : x))); // otimista
    try {
      await setTaskStatus(t.id, next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar");
      setOrder(tasks); // reverte
      router.refresh();
    }
  }

  async function remove(id: number) {
    if (!confirm("Excluir esta tarefa?")) return;
    const snapshot = order;
    setOrder((prev) => prev.filter((x) => x.id !== id)); // otimista
    try {
      await deleteTask(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
      setOrder(snapshot); // reverte
      router.refresh();
    }
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    // A lista pode estar filtrada: reordena entre os visíveis e devolve a ordem
    // global, sem tirar do lugar quem o filtro esconde.
    const next = reorderWithinFilter(order, shown, Number(active.id), Number(over.id));
    if (!next) return;
    setOrder(next); // otimista
    try {
      await reorderTasks(next.map((t) => t.id));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reordenar");
      setOrder(tasks); // reverte
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-3xl md:text-4xl font-bold leading-none tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
            Tarefas
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Organize o que precisa ser feito</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setManageOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
          >
            <Tags className="h-4 w-4" /> Categorias
          </button>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* filtros de status */}
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

      {/* filtros de categoria (2ª fileira) */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCatFilter("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              catFilter === "all" ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:bg-accent/80"
            }`}
          >
            Todas
          </button>
          {categories.map((c) => {
            const active = catFilter === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCatFilter(c.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:bg-accent/80"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {/* lista */}
      {shown.length === 0 ? (
        <Reveal stagger className="space-y-2">
          <div className="glass rounded-2xl border border-border py-16 text-center">
            <EmptyState lottie="/lottie/empty-tasks.lottie">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhuma tarefa aqui.</p>
            </EmptyState>
          </div>
        </Reveal>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={shown.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {shown.map((t) => {
                const done = t.status === "completed";
                const overdue = Boolean(t.due_on && !done && t.due_on < today);
                return (
                  <SortableTask
                    key={t.id}
                    t={t}
                    category={t.category_id ? catById.get(t.category_id) ?? null : null}
                    done={done}
                    overdue={overdue}
                    onToggle={() => toggle(t)}
                    onEdit={() => { setEditing(t); setModalOpen(true); }}
                    onRemove={() => remove(t.id)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {modalOpen && <TaskModal editing={editing} categories={categories} onClose={() => setModalOpen(false)} />}
      {manageOpen && <TaskCategoryManager categories={categories} onClose={() => setManageOpen(false)} />}
    </div>
  );
}

function SortableTask({
  t,
  category,
  done,
  overdue,
  onToggle,
  onEdit,
  onRemove,
}: {
  t: Task;
  category: TaskCategory | null;
  done: boolean;
  overdue: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: t.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="glass card-glow flex items-start gap-3 rounded-2xl border border-border p-4"
    >
      <button
        type="button"
        className="mt-0.5 cursor-grab touch-none text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
        title="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        onClick={onToggle}
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
          <h3 className={`line-clamp-2 text-sm font-medium ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
            {t.title}
          </h3>
        </div>
        {t.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_META[t.status].color}`}>
            {STATUS_META[t.status].label}
          </span>
          <span className={`text-[11px] font-medium ${PRIORITY_META[t.priority].text}`}>
            {PRIORITY_META[t.priority].label}
          </span>
          {category && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: `${category.color}22`, color: category.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category.color }} />
              {category.name}
            </span>
          )}
          {t.due_on && (
            <span className={`flex items-center gap-1 text-[11px] ${overdue ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
              <CalendarClock className="h-3 w-3" />
              <span className="num">
                {formatDateBR(t.due_on)}
                {t.due_time ? ` · ${formatTimeBR(t.due_time)}` : ""}
              </span>
              {overdue ? " · atrasada" : ""}
            </span>
          )}
          {t.reminder_minutes !== null && (
            <span className="flex items-center text-muted-foreground" title={reminderLabel(t.reminder_minutes)}>
              <Bell className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button onClick={onEdit} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
          <Edit3 className="h-4 w-4" />
        </button>
        <button onClick={onRemove} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

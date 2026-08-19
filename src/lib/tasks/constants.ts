import type { TaskStatus, TaskPriority } from "@/types/task";

export const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300" },
  in_progress: { label: "Em andamento", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
  completed: { label: "Concluída", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
};

export const PRIORITY_META: Record<TaskPriority, { label: string; dot: string; text: string }> = {
  low: { label: "Baixa", dot: "#94a3b8", text: "text-slate-500 dark:text-slate-400" },
  medium: { label: "Média", dot: "#f59e0b", text: "text-amber-600 dark:text-amber-400" },
  high: { label: "Alta", dot: "#ef4444", text: "text-red-600 dark:text-red-400" },
};

export const STATUS_ORDER: TaskStatus[] = ["pending", "in_progress", "completed"];
export const PRIORITY_ORDER: TaskPriority[] = ["high", "medium", "low"];

/**
 * Opções de lembrete da tarefa. Separadas das do calendário de propósito: a
 * tarefa tem "Na hora", o evento não, e acoplar as duas faria uma mudança no
 * calendário mexer nas tarefas.
 */
export const TASK_REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Sem lembrete" },
  { value: 0, label: "Na hora" },
  { value: 5, label: "5 minutos antes" },
  { value: 15, label: "15 minutos antes" },
  { value: 30, label: "30 minutos antes" },
  { value: 60, label: "1 hora antes" },
  { value: 1440, label: "1 dia antes" },
];

/** Rótulo do lembrete para leitura (card e detalhe). */
export function reminderLabel(minutes: number | null): string {
  return TASK_REMINDER_OPTIONS.find((o) => o.value === minutes)?.label ?? "Sem lembrete";
}

/** Cores disponíveis para as categorias de tarefas (#29). */
export const TASK_CATEGORY_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#10b981",
  "#f59e0b", "#ef4444", "#14b8a6", "#f97316",
];

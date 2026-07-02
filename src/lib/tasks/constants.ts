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

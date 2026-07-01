import type { TaskStatus, TaskPriority } from "@/types/task";

export const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-slate-100 text-slate-600" },
  in_progress: { label: "Em andamento", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluída", color: "bg-emerald-100 text-emerald-700" },
};

export const PRIORITY_META: Record<TaskPriority, { label: string; dot: string; text: string }> = {
  low: { label: "Baixa", dot: "#94a3b8", text: "text-slate-500" },
  medium: { label: "Média", dot: "#f59e0b", text: "text-amber-600" },
  high: { label: "Alta", dot: "#ef4444", text: "text-red-600" },
};

export const STATUS_ORDER: TaskStatus[] = ["pending", "in_progress", "completed"];
export const PRIORITY_ORDER: TaskPriority[] = ["high", "medium", "low"];

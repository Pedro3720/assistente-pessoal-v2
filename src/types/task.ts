export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_on: string | null; // YYYY-MM-DD
  position: number;
  category_id: number | null;
}

export interface TaskCategory {
  id: number;
  name: string;
  color: string;
}

/** Tarefa com a categoria já resolvida (para exibir o chip). */
export interface TaskWithCategory extends Task {
  category: TaskCategory | null;
}

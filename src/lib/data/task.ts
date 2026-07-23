import { createClient } from "@/lib/supabase/server";
import type { Task, TaskCategory } from "@/types/task";

export async function getTasks(): Promise<Task[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Task[];
}

/**
 * Categorias de tarefas do usuário. Cai em lista vazia se a tabela ainda não
 * existir (migração 0014 não rodada), para não quebrar a página.
 */
export async function getTaskCategories(): Promise<TaskCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_categories")
    .select("id, name, color")
    .order("name", { ascending: true });
  if (error) {
    // 42P01 = tabela não existe; PGRST205 = não está no schema cache
    if (error.code === "42P01" || error.code === "PGRST205") return [];
    throw new Error(error.message);
  }
  return (data ?? []) as TaskCategory[];
}

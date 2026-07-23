import { getTasks, getTaskCategories } from "@/lib/data/task";
import { TasksView } from "@/components/tasks/tasks-view";
import type { Task, TaskCategory } from "@/types/task";

export default async function TarefasPage() {
  let tasks: Task[];
  let categories: TaskCategory[];
  try {
    [tasks, categories] = await Promise.all([getTasks(), getTaskCategories()]);
  } catch (e) {
    return <TasksLoadError message={e instanceof Error ? e.message : "Erro desconhecido"} />;
  }

  return <TasksView tasks={tasks} categories={categories} />;
}

function TasksLoadError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-extrabold leading-none tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
        Tarefas
      </h1>
      <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="font-semibold">Não foi possível carregar as tarefas.</p>
        <p className="mt-1 font-mono text-xs text-amber-800">{message}</p>
        <p className="mt-3">
          Se a tabela ainda não existe, rode{" "}
          <code className="rounded bg-amber-100 px-1">supabase/migrations/20260701000002_tasks.sql</code>{" "}
          no SQL Editor do Supabase e recarregue.
        </p>
      </div>
    </div>
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { idParam } from "@/lib/validation/common";
import { taskInput, statusSchema, reorderInput, taskCategoryInput } from "@/lib/validation/task";
import type { PostgrestError } from "@supabase/supabase-js";

/** Colunas opcionais que podem não existir se a migração ainda não foi rodada. */
const OPTIONAL_TASK_COLUMNS = ["category_id", "due_time", "reminder_minutes"] as const;

/** true se o erro for "coluna <column> não existe". */
function isMissingColumn(error: PostgrestError | null, column: string): boolean {
  if (!error) return false;
  const msg = `${error.message} ${error.details ?? ""}`.toLowerCase();
  return (error.code === "42703" || error.code === "PGRST204") && msg.includes(column);
}

/**
 * Escreve a linha e, se o banco reclamar de uma coluna opcional que ainda não
 * existe (migração não rodada), tira essa coluna e tenta de novo. No máximo uma
 * tentativa extra por coluna opcional.
 */
async function writeTolerant(
  // PromiseLike, e não Promise: o builder do Supabase é thenable, não Promise.
  run: (payload: Record<string, unknown>) => PromiseLike<{ error: PostgrestError | null }>,
  row: Record<string, unknown>
): Promise<void> {
  const payload = { ...row };
  for (let attempt = 0; attempt <= OPTIONAL_TASK_COLUMNS.length; attempt++) {
    const { error } = await run(payload);
    if (!error) return;
    const missing = OPTIONAL_TASK_COLUMNS.find((c) => c in payload && isMissingColumn(error, c));
    if (!missing) throw new Error(error.message);
    delete payload[missing];
  }
}

function revalidate() {
  revalidatePath("/tarefas");
  revalidatePath("/");
}

export async function createTask(raw: unknown) {
  const input = taskInput.parse(raw);
  const { supabase, userId } = await requireUser();
  const { data: top } = await supabase
    .from("tasks")
    .select("position")
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();
  const position = (top?.position ?? 0) - 1;
  const row = { ...input, position, user_id: userId };
  await writeTolerant(
    (payload) => supabase.from("tasks").insert(payload).then((r) => ({ error: r.error })),
    row
  );
  revalidate();
}

export async function reorderTasks(ids: unknown) {
  const order = reorderInput.parse(ids);
  const { supabase } = await requireUser();
  const results = await Promise.all(
    order.map((id, index) =>
      supabase.from("tasks").update({ position: index }).eq("id", id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
  revalidate();
}

export async function updateTask(id: number, raw: unknown) {
  const rowId = idParam.parse(id);
  const input = taskInput.parse(raw);
  const { supabase } = await requireUser();
  await writeTolerant(
    (payload) => supabase.from("tasks").update(payload).eq("id", rowId).then((r) => ({ error: r.error })),
    input
  );
  revalidate();
}

export async function setTaskStatus(id: number, status: unknown) {
  const rowId = idParam.parse(id);
  const value = statusSchema.parse(status);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("tasks").update({ status: value }).eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteTask(id: number) {
  const rowId = idParam.parse(id);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("tasks").delete().eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidate();
}

// ── Categorias de tarefas (#29) ─────────────────────────────

export async function createTaskCategory(raw: unknown) {
  const input = taskCategoryInput.parse(raw);
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("task_categories").insert({ ...input, user_id: userId });
  if (error) throw new Error(error.message);
  revalidate();
}

export async function updateTaskCategory(id: number, raw: unknown) {
  const rowId = idParam.parse(id);
  const input = taskCategoryInput.parse(raw);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("task_categories").update(input).eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteTaskCategory(id: number) {
  const rowId = idParam.parse(id);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("task_categories").delete().eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidate();
}

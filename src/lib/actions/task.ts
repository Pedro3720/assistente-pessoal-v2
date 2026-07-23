"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { taskInput, statusSchema, reorderInput, taskCategoryInput } from "@/lib/validation/task";
import type { PostgrestError } from "@supabase/supabase-js";

/** true se o erro for "coluna category_id não existe" (migração 0014 ainda não rodada). */
function isMissingCategoryColumn(error: PostgrestError | null): boolean {
  if (!error) return false;
  const msg = `${error.message} ${error.details ?? ""}`.toLowerCase();
  return (error.code === "42703" || error.code === "PGRST204") && msg.includes("category_id");
}

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, userId: user.id };
}

function revalidate() {
  revalidatePath("/tarefas");
  revalidatePath("/");
}

export async function createTask(raw: unknown) {
  const input = taskInput.parse(raw);
  const { supabase, userId } = await ctx();
  const { data: top } = await supabase
    .from("tasks")
    .select("position")
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();
  const position = (top?.position ?? 0) - 1;
  const row = { ...input, position, user_id: userId };
  let { error } = await supabase.from("tasks").insert(row);
  if (isMissingCategoryColumn(error)) {
    const { category_id: _drop, ...rest } = row;
    ({ error } = await supabase.from("tasks").insert(rest));
  }
  if (error) throw new Error(error.message);
  revalidate();
}

export async function reorderTasks(ids: unknown) {
  const order = reorderInput.parse(ids);
  const { supabase } = await ctx();
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
  const input = taskInput.parse(raw);
  const { supabase } = await ctx();
  let { error } = await supabase.from("tasks").update(input).eq("id", id);
  if (isMissingCategoryColumn(error)) {
    const { category_id: _drop, ...rest } = input;
    ({ error } = await supabase.from("tasks").update(rest).eq("id", id));
  }
  if (error) throw new Error(error.message);
  revalidate();
}

export async function setTaskStatus(id: number, status: unknown) {
  const value = statusSchema.parse(status);
  const { supabase } = await ctx();
  const { error } = await supabase.from("tasks").update({ status: value }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteTask(id: number) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

// ── Categorias de tarefas (#29) ─────────────────────────────

export async function createTaskCategory(raw: unknown) {
  const input = taskCategoryInput.parse(raw);
  const { supabase, userId } = await ctx();
  const { error } = await supabase.from("task_categories").insert({ ...input, user_id: userId });
  if (error) throw new Error(error.message);
  revalidate();
}

export async function updateTaskCategory(id: number, raw: unknown) {
  const input = taskCategoryInput.parse(raw);
  const { supabase } = await ctx();
  const { error } = await supabase.from("task_categories").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteTaskCategory(id: number) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("task_categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

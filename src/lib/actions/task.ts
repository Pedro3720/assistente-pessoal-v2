"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { taskInput, statusSchema, reorderInput } from "@/lib/validation/task";

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
  const { error } = await supabase.from("tasks").insert({ ...input, position, user_id: userId });
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
  const { error } = await supabase.from("tasks").update(input).eq("id", id);
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

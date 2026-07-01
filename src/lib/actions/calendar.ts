"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { eventInput } from "@/lib/validation/calendar";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, userId: user.id };
}

function revalidate() {
  revalidatePath("/calendario");
  revalidatePath("/");
}

export async function createEvent(raw: unknown) {
  const input = eventInput.parse(raw);
  const { supabase, userId } = await ctx();
  const { error } = await supabase.from("events").insert({ ...input, user_id: userId });
  if (error) throw new Error(error.message);
  revalidate();
}

export async function updateEvent(id: number, raw: unknown) {
  const input = eventInput.parse(raw);
  const { supabase } = await ctx();
  const { error } = await supabase.from("events").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteEvent(id: number) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

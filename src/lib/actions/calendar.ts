"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { eventInput } from "@/lib/validation/calendar";
import {
  pushEvent,
  deleteGoogleEvent,
  fetchGoogleEvents,
  type GoogleEventItem,
} from "@/lib/google/calendar";
import type { CalendarEvent } from "@/types/calendar";

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
  const { data, error } = await supabase
    .from("events")
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Push automático para o Google (best-effort — nunca quebra a criação).
  try {
    const gid = await pushEvent(userId, data as CalendarEvent);
    if (gid) await supabase.from("events").update({ google_event_id: gid }).eq("id", data.id);
  } catch {
    // ignora falhas de sync
  }
  revalidate();
}

export async function updateEvent(id: number, raw: unknown) {
  const input = eventInput.parse(raw);
  const { supabase, userId } = await ctx();
  const { data, error } = await supabase
    .from("events")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  try {
    const gid = await pushEvent(userId, data as CalendarEvent);
    if (gid && gid !== data.google_event_id) {
      await supabase.from("events").update({ google_event_id: gid }).eq("id", id);
    }
  } catch {
    // ignora falhas de sync
  }
  revalidate();
}

export async function deleteEvent(id: number) {
  const { supabase, userId } = await ctx();
  const { data } = await supabase.from("events").select("google_event_id").eq("id", id).single();

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);

  try {
    if (data?.google_event_id) await deleteGoogleEvent(userId, data.google_event_id as string);
  } catch {
    // ignora falhas de sync
  }
  revalidate();
}

/** Pull: importa eventos do Google do mês para o app (só os que ainda não existem). */
export async function importFromGoogle(year: number, month: number): Promise<number> {
  const { supabase, userId } = await ctx();
  const items = await fetchGoogleEvents(userId, year, month);

  // Ids do Google que já temos (para não duplicar, incluindo instâncias de recorrentes).
  const { data: existingRows } = await supabase
    .from("events")
    .select("google_event_id")
    .not("google_event_id", "is", null);
  const existing = new Set((existingRows ?? []).map((r) => r.google_event_id as string));

  const rows = items
    .filter((it) => it.status !== "cancelled")
    .filter((it) => {
      const base = String(it.id).split("_")[0]; // instâncias vêm como "<masterId>_<data>"
      return !existing.has(it.id) && !existing.has(base);
    })
    .map((it) => normalizeGoogleItem(it, userId))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length > 0) {
    const { error } = await supabase.from("events").insert(rows);
    if (error) throw new Error(error.message);
  }
  revalidate();
  return rows.length;
}

function normalizeGoogleItem(it: GoogleEventItem, userId: string) {
  const allDay = !!it.start?.date && !it.start?.dateTime;
  const startsAt = it.start?.dateTime ?? (it.start?.date ? `${it.start.date}T00:00:00-03:00` : null);
  if (!startsAt) return null;
  const endsAt = it.end?.dateTime ?? (it.end?.date ? `${it.end.date}T00:00:00-03:00` : null);

  return {
    user_id: userId,
    title: it.summary ?? "(sem título)",
    description: it.description ?? null,
    starts_at: startsAt,
    ends_at: endsAt,
    all_day: allDay,
    color: "#3b82f6",
    category: null as string | null,
    repeat: "none",
    reminder_minutes: null as number | null,
    google_event_id: it.id,
  };
}

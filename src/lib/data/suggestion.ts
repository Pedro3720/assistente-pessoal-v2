import { createClient } from "@/lib/supabase/server";
import type { Suggestion } from "@/types/suggestion";

export async function getSuggestions(): Promise<Suggestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suggestions")
    .select("id, title, description, image_url, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Suggestion[];
}

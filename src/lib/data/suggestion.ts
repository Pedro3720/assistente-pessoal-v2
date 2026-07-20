import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/auth/admin";
import type { Suggestion, SuggestionWithAuthor } from "@/types/suggestion";

export async function getSuggestions(): Promise<Suggestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suggestions")
    .select("id, title, description, image_url, image_urls, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Suggestion[];
}

export async function getAllSuggestions(): Promise<SuggestionWithAuthor[]> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("suggestions")
    .select("id, user_id, title, description, image_url, image_urls, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as (Suggestion & { user_id: string })[];

  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map<string, string>(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? ""])
  );

  const { data: profs } = await admin.from("profiles").select("id, display_name");
  const nameById = new Map<string, string | null>(
    ((profs ?? []) as { id: string; display_name: string | null }[]).map((p) => [p.id, p.display_name])
  );

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    image_url: r.image_url,
    image_urls: r.image_urls,
    status: r.status,
    created_at: r.created_at,
    author_email: emailById.get(r.user_id) || "sem e-mail",
    author_name: nameById.get(r.user_id) ?? null,
  }));
}

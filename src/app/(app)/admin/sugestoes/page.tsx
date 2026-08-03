import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { getAllSuggestions } from "@/lib/data/suggestion";
import { AdminSuggestionsView } from "@/components/suggestions/admin-suggestions-view";
import { Reveal } from "@/components/effects/reveal";

export default async function AdminSugestoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) redirect("/");

  const suggestions = await getAllSuggestions();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Reveal>
        <h1 className="text-gradient text-3xl md:text-4xl font-bold leading-none tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
          Admin · Sugestões
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Todas as sugestões enviadas pelos usuários.</p>
      </Reveal>
      <AdminSuggestionsView suggestions={suggestions} />
    </div>
  );
}

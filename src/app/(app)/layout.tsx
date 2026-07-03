import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data/profile";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defesa em profundidade: o middleware já bloqueia, mas conferimos aqui também.
  if (!user) redirect("/login");

  const profile = await getProfile();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        userEmail={user.email ?? ""}
        displayName={profile?.display_name ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
      />
      <main className="flex-1">
        <div className="px-6 py-8 pt-20 md:px-10 md:py-10 md:pt-10">{children}</div>
      </main>
    </div>
  );
}

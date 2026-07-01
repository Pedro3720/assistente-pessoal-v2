import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defesa em profundidade: o middleware já bloqueia, mas conferimos aqui também.
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="flex-1 overflow-auto">
        <div className="px-6 py-8 pt-20 md:px-10 md:py-10 md:pt-10">
          {children}
        </div>
      </main>
    </div>
  );
}

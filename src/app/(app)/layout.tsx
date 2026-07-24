import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data/profile";
import { Sidebar } from "@/components/layout/sidebar";
import { NotificationBanner } from "@/components/notifications/notification-banner";
import { IosInstallHint } from "@/components/pwa/ios-install-hint";
import { BottomNav } from "@/components/layout/bottom-nav";
import { isAdminEmail } from "@/lib/auth/admin";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defesa em profundidade: o middleware já bloqueia, mas conferimos aqui também.
  if (!user) redirect("/login");

  const profile = await getProfile();
  const isAdmin = isAdminEmail(user.email);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        userEmail={user.email ?? ""}
        displayName={profile?.display_name ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
        isAdmin={isAdmin}
      />
      <main className="flex-1">
        <div className="px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+6rem)] md:px-10 md:pt-10 md:pb-10">
          <IosInstallHint />
          <NotificationBanner />
          {children}
        </div>
      </main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}

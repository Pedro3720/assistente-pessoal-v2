import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data/profile";
import { Sidebar } from "@/components/layout/sidebar";
import { NotificationBanner } from "@/components/notifications/notification-banner";
import { IosInstallHint } from "@/components/pwa/ios-install-hint";
import { BottomNav } from "@/components/layout/bottom-nav";
import { isAdminEmail } from "@/lib/auth/admin";
import { AppFrame } from "@/components/ui/app-frame";

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
    <div className="flex min-h-screen md:h-screen md:overflow-hidden">
      <Sidebar
        userEmail={user.email ?? ""}
        displayName={profile?.display_name ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
        isAdmin={isAdmin}
      />
      {/* min-w-0: item flex nasce com min-width:auto e NAO encolhe abaixo do
          conteudo. Sem isso, um texto longo (titulo de tarefa, descricao de
          sugestao) estica o main inteiro e a pagina fica mais larga que a tela
          no celular, obrigando a arrastar para o lado (sugestao #32). */}
      <main className="min-w-0 flex-1 md:h-screen">
        <AppFrame>
          {/* Coluna do app: uma largura maxima só, centralizada. Cada pagina
              centraliza a propria largura de leitura dentro dela (mx-auto no
              wrapper externo da rota). Tambem é o que limita o calendario, que
              nao tem largura propria. */}
          <div className="mx-auto w-full max-w-7xl px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+6rem)] md:px-6 md:py-6">
            <IosInstallHint />
            <NotificationBanner />
            {children}
          </div>
        </AppFrame>
      </main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}

import { getProfile } from "@/lib/data/profile";
import { ProfileForm } from "@/components/profile/profile-form";
import { Reveal } from "@/components/effects/reveal";
import { NewPasswordForm } from "@/components/auth/new-password-form";
import { NotificationsSetup } from "@/components/notifications/notifications-setup";
import { GoogleIdentity } from "@/components/profile/google-identity";

export default async function PerfilPage() {
  const profile = await getProfile();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Reveal>
        <h1 className="text-foreground text-3xl md:text-4xl font-bold leading-none tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
          Perfil
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Como o assistente se refere a você.</p>
      </Reveal>
      <Reveal>
        <ProfileForm profile={profile} />
      </Reveal>
      <Reveal>
        <div className="glass rounded-2xl border border-border p-6">
          <h2 className="font-semibold">Trocar senha</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">Defina uma nova senha de acesso.</p>
          <NewPasswordForm mode="change" />
        </div>
      </Reveal>
      {process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ON === "1" && (
        <Reveal>
          <div className="glass rounded-2xl border border-border p-6">
            <h2 className="font-semibold">Conta Google</h2>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">
              Vincule para entrar com o Google nesta mesma conta, com os seus dados.
            </p>
            <GoogleIdentity />
          </div>
        </Reveal>
      )}
      <Reveal>
        <div className="glass rounded-2xl border border-border p-6">
          <h2 className="font-semibold">Notificações</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            Receba lembretes de eventos e tarefas neste dispositivo, mesmo com o app fechado.
          </p>
          <NotificationsSetup />
        </div>
      </Reveal>
    </div>
  );
}

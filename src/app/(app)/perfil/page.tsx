import { getProfile } from "@/lib/data/profile";
import { ProfileForm } from "@/components/profile/profile-form";
import { Reveal } from "@/components/effects/reveal";

export default async function PerfilPage() {
  const profile = await getProfile();

  return (
    <div className="max-w-3xl space-y-6">
      <Reveal>
        <h1 className="text-gradient text-4xl font-bold leading-none tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
          Perfil
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Como o assistente se refere a você.</p>
      </Reveal>
      <Reveal>
        <ProfileForm profile={profile} />
      </Reveal>
    </div>
  );
}

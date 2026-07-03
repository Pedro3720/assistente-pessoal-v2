"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { AvatarPicker } from "./avatar-picker";
import { updateProfile } from "@/lib/actions/profile";
import type { Profile } from "@/types/profile";

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function action(formData: FormData) {
    setSaving(true);
    try {
      await updateProfile(formData);
      toast.success("Perfil atualizado");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={action} className="glass card-glow max-w-md space-y-5 rounded-2xl border border-border p-6">
      <div className="space-y-1.5">
        <label htmlFor="display_name" className="text-sm font-medium">Como quer ser chamado(a)</label>
        <Input id="display_name" name="display_name" defaultValue={profile?.display_name ?? ""} placeholder="Seu nome" required />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-sm font-medium">Telefone (opcional)</label>
        <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} placeholder="(00) 00000-0000" />
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Foto / avatar</span>
        <AvatarPicker name="perfil" initialUrl={profile?.avatar_url ?? null} />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}

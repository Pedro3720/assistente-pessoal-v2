"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePassword } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";

export function NewPasswordForm({ mode }: { mode: "reset" | "change" }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa de ao menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setSaving(true);
    try {
      const result = await updatePassword(password);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (mode === "reset") {
        toast.success("Senha redefinida! Você já está conectado.");
        router.push("/");
        router.refresh();
      } else {
        toast.success("Senha alterada com sucesso.");
        setPassword("");
        setConfirm("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar a senha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="new-password" className="text-sm font-medium">Nova senha</label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm-password" className="text-sm font-medium">Confirmar senha</label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? "Salvando..." : mode === "reset" ? "Redefinir senha" : "Alterar senha"}
      </button>
    </form>
  );
}

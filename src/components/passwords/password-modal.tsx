"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { createPassword, updatePassword } from "@/lib/actions/password";
import type { PasswordItem } from "@/types/password";

function generatePassword(len = 16): string {
  const charset = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*?";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < len; i++) out += charset[arr[i] % charset.length];
  return out;
}

export function PasswordModal({ editing, onClose }: { editing: PasswordItem | null; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [username, setUsername] = useState(editing?.username ?? "");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState(editing?.url ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) {
      toast.error("O título é obrigatório.");
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      username: username.trim() || null,
      password, // em branco no modo edição = mantém a atual
      url: url.trim() || null,
      notes: notes.trim() || null,
    };
    try {
      if (editing) await updatePassword(editing.id, payload);
      else await createPassword(payload);
      router.refresh();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-popover p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">{editing ? "Editar" : "Nova"} Senha</h2>
          <div className="w-9" />
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="Ex: Gmail, Nubank..."
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Usuário / e-mail</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="voce@exemplo.com"
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Senha</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editing ? "•••••• (em branco = manter)" : "Digite ou gere"}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setPassword(generatePassword()); setShow(true); }}
                className="flex items-center gap-1 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:bg-accent"
                title="Gerar senha forte"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Gerar
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observações (opcional)..."
              className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-2 text-sm placeholder:text-muted-foreground"
            />
          </div>

          <button
            onClick={save}
            disabled={saving || !title.trim()}
            className="mt-2 w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Salvando..." : editing ? "Salvar alterações" : "Salvar senha"}
          </button>
        </div>
      </div>
    </div>
  );
}

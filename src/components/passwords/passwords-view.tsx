"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Eye, EyeOff, Copy, Edit3, Trash2, ExternalLink, KeyRound, User,
} from "lucide-react";
import { toast } from "sonner";
import { deletePassword, revealPassword } from "@/lib/actions/password";
import { PasswordModal } from "./password-modal";
import type { PasswordItem } from "@/types/password";

export function PasswordsView({ passwords }: { passwords: PasswordItem[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PasswordItem | null>(null);
  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const shown = useMemo(() => {
    if (!search.trim()) return passwords;
    const q = search.toLowerCase();
    return passwords.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.username ?? "").toLowerCase().includes(q) ||
        (p.url ?? "").toLowerCase().includes(q)
    );
  }, [passwords, search]);

  async function reveal(id: number) {
    if (revealed[id] !== undefined) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    setLoadingId(id);
    try {
      const value = await revealPassword(id);
      setRevealed((prev) => ({ ...prev, [id]: value }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao revelar");
    } finally {
      setLoadingId(null);
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  async function copyPassword(id: number) {
    const value = revealed[id] ?? (await revealPassword(id).catch(() => ""));
    if (!value) {
      toast.error("Sem senha para copiar");
      return;
    }
    await copy(value, "Senha");
  }

  async function remove(id: number) {
    if (!confirm("Excluir esta senha?")) return;
    try {
      await deletePassword(id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold leading-none tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
            Senhas
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Cofre criptografado das suas credenciais</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nova Senha
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por título, usuário ou site..."
          className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary/50"
        />
      </div>

      <div className="space-y-2">
        {shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-card py-16 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {search ? "Nenhuma senha encontrada." : "Nenhuma senha salva ainda."}
            </p>
          </div>
        ) : (
          shown.map((p) => {
            const value = revealed[p.id];
            const isRevealed = value !== undefined;
            return (
              <div key={p.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <h3 className="truncate text-sm font-semibold">{p.title}</h3>

                    {p.username && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{p.username}</span>
                        <button onClick={() => copy(p.username!, "Usuário")} className="text-muted-foreground hover:text-foreground" title="Copiar usuário">
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs">
                      <KeyRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {p.has_secret ? (
                        <>
                          <span className="font-mono text-foreground">
                            {isRevealed ? (value || "(vazia)") : "••••••••••"}
                          </span>
                          <button onClick={() => reveal(p.id)} className="text-muted-foreground hover:text-foreground" title={isRevealed ? "Ocultar" : "Revelar"}>
                            {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          <button onClick={() => copyPassword(p.id)} className="text-muted-foreground hover:text-foreground" title="Copiar senha">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          {loadingId === p.id && <span className="text-[10px] text-muted-foreground">...</span>}
                        </>
                      ) : (
                        <span className="text-muted-foreground">sem senha</span>
                      )}
                    </div>

                    {p.url && (
                      <a
                        href={p.url.startsWith("http") ? p.url : `https://${p.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{p.url}</span>
                      </a>
                    )}

                    {p.notes && <p className="line-clamp-2 text-xs text-muted-foreground">{p.notes}</p>}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => { setEditing(p); setModalOpen(true); }} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(p.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {modalOpen && <PasswordModal editing={editing} onClose={() => setModalOpen(false)} />}
    </div>
  );
}

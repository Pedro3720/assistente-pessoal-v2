"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, parseBRL } from "@/lib/money";
import { createBank, deleteBank } from "@/lib/actions/finance";
import { MoneyInput } from "./money-input";
import type { BankWithBalance } from "@/types/finance";

export function BankManager({ banks }: { banks: BankWithBalance[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🏦");
  const [opening, setOpening] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createBank({
        name: name.trim(),
        icon: icon || "🏦",
        opening_balance: parseBRL(opening) || 0,
      });
      setName("");
      setIcon("🏦");
      setOpening("");
      setAdding(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar conta");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Excluir esta conta? As transações ficam sem conta vinculada.")) return;
    try {
      await deleteBank(id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  return (
    <div className="glass card-glow rounded-2xl border border-border p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Contas</h3>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-accent"
        >
          <Plus className="h-3 w-3" /> Nova conta
        </button>
      </div>

      {adding && (
        <div className="mb-4 space-y-2 rounded-lg border border-dashed border-border p-3">
          <div className="flex gap-2">
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={2}
              className="w-12 rounded-lg border border-border bg-muted px-2 py-2 text-center text-sm"
              placeholder="🏦"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Nome da conta"
              className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Saldo inicial</label>
            <MoneyInput value={opening} onChange={setOpening} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving || !name.trim()}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Adicionar"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {banks.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {banks.map((bank) => (
            <div key={bank.id} className="group relative rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:border-primary/40">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-base">{bank.icon}</span>
                <span className="truncate text-sm font-medium">{bank.name}</span>
              </div>
              <p className={`num text-lg font-semibold ${bank.balance >= 0 ? "text-positive" : "text-negative"}`}>
                {formatBRL(bank.balance)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">saldo atual</p>
              <button
                onClick={() => remove(bank.id)}
                className="absolute right-2 top-2 hidden rounded p-1 text-muted-foreground hover:text-red-500 group-hover:block"
                title="Excluir conta"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

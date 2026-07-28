"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, CreditCard, Plus, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { formatBRL, parseBRL } from "@/lib/money";
import { createBank, deleteBank } from "@/lib/actions/finance";
import { AnimatedNumber } from "@/components/effects/animated-number";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { DUR, EASE } from "@/lib/motion";
import { EntityIcon } from "@/components/ui/entity-icon";
import { IconPicker } from "@/components/ui/icon-picker";
import { ConnectBank } from "./connect-bank";
import { MoneyInput } from "./money-input";
import type { BankWithBalance } from "@/types/finance";

/**
 * Resumo das contas no topo de /financas: mostra o banco de maior saldo, a
 * soma de todas as contas e quantas estão conectadas. Ao abrir, traz a lista
 * de contas (com criar e excluir) e os indicadores do mês, que antes ficavam
 * em quatro cartões separados no topo da página.
 */
export function AccountsSummary({
  banks,
  income,
  expense,
  invoicesTotal,
  podeConectar = false,
}: {
  banks: BankWithBalance[];
  income: number;
  expense: number;
  invoicesTotal: number;
  /** true quando a integração bancária está configurada no servidor */
  podeConectar?: boolean;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [opening, setOpening] = useState("");
  const [saving, setSaving] = useState(false);

  const total = banks.reduce((s, b) => s + b.balance, 0);
  // conta em destaque: a de maior saldo, que vira o "rosto" do card
  const main = banks.reduce<BankWithBalance | null>(
    (best, b) => (!best || b.balance > best.balance ? b : best),
    null
  );

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createBank({
        name: name.trim(),
        icon: icon || "landmark",
        opening_balance: parseBRL(opening) || 0,
      });
      setName("");
      setIcon("");
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
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 text-left"
      >
        <EntityIcon
          value={main?.icon}
          fallback="bank"
          size={24}
          className="h-12 w-12 rounded-full bg-muted text-muted-foreground"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-muted-foreground">Saldo em contas</span>
          <AnimatedNumber
            value={total}
            currency
            className={`block text-2xl font-bold leading-tight ${total < 0 ? "text-negative" : ""}`}
          />
          <span className="block text-xs text-muted-foreground">
            {banks.length === 0
              ? "Nenhuma conta cadastrada"
              : `${banks.length} ${banks.length === 1 ? "conta conectada" : "contas conectadas"}`}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: DUR.enter, ease: EASE.out }}
            className="overflow-hidden"
          >
            <div className="mt-4 border-t border-border pt-4">
              {/* Indicadores do mês (vieram dos cartões do topo). Em tela
                  estreita viram linhas: em 3 colunas a 320px o valor não cabe
                  e era cortado. A partir de sm voltam a empilhar. */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-muted/40 p-3 sm:block">
                  <p className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                    <TrendingUp className="h-3 w-3 shrink-0 text-positive" /> Entradas
                  </p>
                  <p className="num truncate text-sm font-semibold text-positive sm:mt-1">{formatBRL(income)}</p>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-muted/40 p-3 sm:block">
                  <p className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                    <TrendingDown className="h-3 w-3 shrink-0 text-negative" /> Despesas
                  </p>
                  <p className="num truncate text-sm font-semibold text-negative sm:mt-1">{formatBRL(expense)}</p>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-muted/40 p-3 sm:block">
                  <p className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                    <CreditCard className="h-3 w-3 shrink-0" /> Faturas
                  </p>
                  <p className="num truncate text-sm font-semibold text-amber-600 sm:mt-1 dark:text-amber-400">
                    {formatBRL(invoicesTotal)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Contas</h3>
                <div className="flex items-center gap-2">
                  {podeConectar && <ConnectBank />}
                  <button
                    onClick={() => setAdding((v) => !v)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-accent"
                  >
                    <Plus className="h-3 w-3" /> Nova conta
                  </button>
                </div>
              </div>

              {adding && (
                <div className="mt-2 space-y-2 rounded-xl border border-dashed border-border p-3">
                  <div className="flex gap-2">
                    <IconPicker value={icon} onChange={setIcon} withBanks fallback="bank" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                      placeholder="Nome da conta"
                      className="min-w-0 flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm"
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
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Adicione sua primeira conta para acompanhar o saldo.
                </p>
              ) : (
                <div className="mt-2 divide-y divide-border">
                  {banks.map((bank) => (
                    <div key={bank.id} className="group flex items-center gap-3 py-2.5">
                      <EntityIcon
                        value={bank.icon}
                        fallback="bank"
                        size={18}
                        className="h-9 w-9 rounded-full bg-muted text-muted-foreground"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{bank.name}</span>
                      <span
                        className={`num shrink-0 text-sm font-semibold ${
                          bank.balance >= 0 ? "text-positive" : "text-negative"
                        }`}
                      >
                        {formatBRL(bank.balance)}
                      </span>
                      <button
                        onClick={() => remove(bank.id)}
                        aria-label={`Excluir ${bank.name}`}
                        className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

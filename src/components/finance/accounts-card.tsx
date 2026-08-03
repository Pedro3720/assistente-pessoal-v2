import { EntityIcon } from "@/components/ui/entity-icon";
import { Money } from "@/components/ui/money";
import type { BankWithBalance } from "@/types/finance";

/**
 * Só contas de verdade. Cartão de crédito é outra entidade no modelo e tem
 * outra pergunta a responder (quanto devo, quanto sobra de limite), então
 * mora no próprio card.
 */
export function AccountsCard({ banks }: { banks: BankWithBalance[] }) {
  const total = banks.reduce((sum, b) => sum + Number(b.balance ?? 0), 0);

  return (
    <div className="rounded-lg bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Contas</h3>
        <Money value={total} className="text-xs text-muted-foreground" />
      </div>

      {banks.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma conta cadastrada.</p>
      ) : (
        banks.map((bank) => (
          <div
            key={bank.id}
            className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0 first:pt-0"
          >
            <EntityIcon
              value={bank.icon}
              fallback="bank"
              size={16}
              className="h-7 w-7 rounded-full bg-muted text-muted-foreground"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{bank.name}</span>
              <span className="block text-[11px] text-subtle-foreground">Conta bancária</span>
            </span>
            <Money value={Number(bank.balance ?? 0)} className="text-sm font-medium" />
          </div>
        ))
      )}
    </div>
  );
}

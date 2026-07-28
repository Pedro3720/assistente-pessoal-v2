import { Wallet } from "lucide-react";
import { formatBRL } from "@/lib/money";
import { EntityIcon } from "@/components/ui/entity-icon";
import type { BankStatement } from "@/lib/data/finance";
import type { BankWithBalance, Category } from "@/types/finance";
import { StatementAccountSelect } from "./statement-account-select";

function dayHeader(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function Statement({
  statement,
  banks,
  selectedId,
  categories,
  monthLabel,
}: {
  statement: BankStatement;
  banks: BankWithBalance[];
  selectedId: number;
  categories: Category[];
  monthLabel: string;
}) {
  const catById = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="glass card-glow rounded-2xl border border-border">
      <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Extrato da Conta</h3>
          <span className="text-sm capitalize text-muted-foreground">· {monthLabel}</span>
        </div>
        <StatementAccountSelect banks={banks} selectedId={selectedId} />
      </div>

      {/* saldo anterior */}
      <div className="flex items-center justify-between bg-muted/40 px-5 py-2.5 text-sm">
        <span className="text-muted-foreground">Saldo anterior</span>
        <span className={`num font-medium ${statement.opening >= 0 ? "text-foreground" : "text-negative"}`}>
          {formatBRL(statement.opening)}
        </span>
      </div>

      {statement.count === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          Nenhum lançamento nesta conta em {monthLabel}.
        </p>
      ) : (
        statement.days.map((day) => (
          <div key={day.date}>
            <div className="border-y border-border bg-accent/40 px-5 py-1.5 text-xs font-semibold capitalize text-accent-foreground">
              {dayHeader(day.date)}
            </div>
            {day.entries.map((t) => {
              const cat = t.category_id ? catById.get(t.category_id) : null;
              const label = cat
                ? cat.name
                : t.is_card_payment
                  ? "Pagamento de fatura"
                  : "Sem categoria";
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-2.5 last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <EntityIcon
                      value={cat?.icon ?? (t.is_card_payment ? "credit-card" : "")}
                      size={16}
                      className="h-8 w-8 rounded-full bg-muted text-muted-foreground"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      <p className="truncate text-xs text-muted-foreground">{label}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-6 text-right">
                    <span className={`num text-sm font-semibold ${t.type === "income" ? "text-positive" : "text-negative"}`}>
                      {t.type === "income" ? "+" : "-"}
                      {formatBRL(Number(t.amount))}
                    </span>
                    <span className="num w-28 text-xs text-muted-foreground">
                      saldo {formatBRL(t.balance)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}

      {/* saldo final */}
      <div className="flex items-center justify-between border-t-2 border-border bg-muted/40 px-5 py-3 text-sm">
        <span className="font-semibold">Saldo final</span>
        <span className={`num text-base font-bold ${statement.closing >= 0 ? "text-positive" : "text-negative"}`}>
          {formatBRL(statement.closing)}
        </span>
      </div>
    </div>
  );
}

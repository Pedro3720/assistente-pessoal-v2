import { Wallet } from "lucide-react";
import { formatBRL } from "@/lib/money";
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
    <div className="rounded-xl border bg-card shadow-sm">
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
        <span className={`font-medium tabular-nums ${statement.opening >= 0 ? "text-foreground" : "text-red-600"}`}>
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
                ? `${cat.icon} ${cat.name}`
                : t.is_card_payment
                  ? "💳 Pagamento de fatura"
                  : "Sem categoria";
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-2.5 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.description}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-6 text-right">
                    <span className={`text-sm font-semibold tabular-nums ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                      {t.type === "income" ? "+" : "-"}
                      {formatBRL(Number(t.amount))}
                    </span>
                    <span className="w-28 text-xs tabular-nums text-muted-foreground">
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
        <span className={`text-base font-bold tabular-nums ${statement.closing >= 0 ? "text-green-600" : "text-red-600"}`}>
          {formatBRL(statement.closing)}
        </span>
      </div>
    </div>
  );
}

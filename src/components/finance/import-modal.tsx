"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, ChevronRight, Check, AlertCircle, RefreshCw } from "lucide-react";
import { parseFile, type ParsedTx } from "@/lib/parsers/ofx";
import { bulkCreateTransactions } from "@/lib/actions/finance";
import { formatBRL } from "@/lib/money";
import type { BankWithBalance, CardWithInvoice, Category, TxType } from "@/types/finance";

// ── Auto-categorização por palavra-chave ──────────────────────────────────
type Rule = [kw: string, category: string | null, type: TxType, cardPayment?: boolean];

const RULES: Rule[] = [
  ["pagamento de fatura", null, "expense", true],
  ["pagto fatura", null, "expense", true],
  ["pagamento cartao", null, "expense", true],
  ["pag cartao", null, "expense", true],
  ["fatura cartao", null, "expense", true],
  ["supermercado", "Alimentação", "expense"],
  ["mercado", "Alimentação", "expense"],
  ["padaria", "Alimentação", "expense"],
  ["restaurante", "Alimentação", "expense"],
  ["lanchonete", "Alimentação", "expense"],
  ["ifood", "Alimentação", "expense"],
  ["rappi", "Alimentação", "expense"],
  ["acougue", "Alimentação", "expense"],
  ["hortifruti", "Alimentação", "expense"],
  ["uber", "Transporte", "expense"],
  ["99", "Transporte", "expense"],
  ["cabify", "Transporte", "expense"],
  ["posto ", "Transporte", "expense"],
  ["gasolina", "Transporte", "expense"],
  ["combustivel", "Transporte", "expense"],
  ["estacionamento", "Transporte", "expense"],
  ["pedagio", "Transporte", "expense"],
  ["aluguel", "Moradia", "expense"],
  ["condominio", "Moradia", "expense"],
  ["iptu", "Moradia", "expense"],
  ["energia", "Moradia", "expense"],
  ["enel", "Moradia", "expense"],
  ["internet", "Moradia", "expense"],
  ["vivo ", "Moradia", "expense"],
  ["claro ", "Moradia", "expense"],
  ["farmacia", "Saúde", "expense"],
  ["drogaria", "Saúde", "expense"],
  ["hospital", "Saúde", "expense"],
  ["clinica", "Saúde", "expense"],
  ["unimed", "Saúde", "expense"],
  ["academia", "Saúde", "expense"],
  ["faculdade", "Educação", "expense"],
  ["escola", "Educação", "expense"],
  ["mensalidade", "Educação", "expense"],
  ["curso", "Educação", "expense"],
  ["cinema", "Lazer", "expense"],
  ["shopping", "Lazer", "expense"],
  ["netflix", "Assinaturas", "expense"],
  ["spotify", "Assinaturas", "expense"],
  ["amazon prime", "Assinaturas", "expense"],
  ["disney", "Assinaturas", "expense"],
  ["salario", "Salário", "income"],
  ["vencimento", "Salário", "income"],
  ["pix recebido", "Outras Receitas", "income"],
  ["transf recebida", "Outras Receitas", "income"],
  ["rendimento", "Investimentos", "income"],
  ["dividendo", "Investimentos", "income"],
  ["resgate", "Investimentos", "income"],
];

function autoCateg(desc: string, amount: number): { type: TxType; categoryName: string | null; isCardPayment: boolean } {
  const norm = desc.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  for (const [kw, cat, type, cardPay] of RULES) {
    if (norm.includes(kw)) return { type, categoryName: cat, isCardPayment: !!cardPay };
  }
  return amount > 0
    ? { type: "income", categoryName: "Outras Receitas", isCardPayment: false }
    : { type: "expense", categoryName: "Outros", isCardPayment: false };
}

interface ImportRow extends ParsedTx {
  type: TxType;
  categoryId: number | null;
  isCardPayment: boolean;
  cardId: number | null;
  skip: boolean;
}

type Step = "upload" | "categorize" | "done";

export function ImportModal({
  banks,
  cards,
  categories,
  onClose,
}: {
  banks: BankWithBalance[];
  cards: CardWithInvoice[];
  categories: Category[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [bankId, setBankId] = useState<number | null>(banks.length === 1 ? banks[0].id : null);
  const fileRef = useRef<HTMLInputElement>(null);

  const resolveCat = useCallback(
    (name: string | null, type: TxType) =>
      name ? categories.find((c) => c.kind === type && c.name === name)?.id ?? null : null,
    [categories]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setParseError(null);
      setFileName(file.name);
      try {
        const parsed = await parseFile(file);
        if (parsed.length === 0) {
          setParseError("Nenhuma transação encontrada. Verifique se é um OFX ou CSV válido do seu banco.");
          return;
        }
        const imported: ImportRow[] = parsed.map((tx) => {
          const { type, categoryName, isCardPayment } = autoCateg(tx.description, tx.amount);
          return {
            ...tx,
            type,
            categoryId: resolveCat(categoryName, type),
            isCardPayment,
            cardId: null,
            skip: false,
          };
        });
        setRows(imported);
        setStep("categorize");
      } catch (e) {
        setParseError(e instanceof Error ? e.message : "Erro ao processar o arquivo.");
      }
    },
    [resolveCat]
  );

  const update = useCallback((id: string, changes: Partial<ImportRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)));
  }, []);

  const toImport = rows.filter((r) => !r.skip);

  const handleImport = useCallback(async () => {
    if (!toImport.length) return;
    setImporting(true);
    setParseError(null);
    try {
      await bulkCreateTransactions(
        toImport.map((r) => ({
          description: r.description,
          amount: Math.abs(r.amount),
          type: r.type,
          category_id: r.isCardPayment ? null : r.categoryId,
          bank_id: bankId,
          card_id: r.isCardPayment ? r.cardId : null,
          is_card_payment: r.isCardPayment,
          occurred_on: r.date,
        }))
      );
      setImportedCount(toImport.length);
      setStep("done");
      router.refresh();
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Erro ao importar.");
    } finally {
      setImporting(false);
    }
  }, [toImport, bankId, router]);

  const STEPS: Step[] = ["upload", "categorize", "done"];
  const LABELS: Record<Step, string> = { upload: "Arquivo", categorize: "Revisar", done: "Concluído" };
  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex w-full max-w-5xl flex-col rounded-2xl border border-border bg-popover shadow-2xl"
        style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header + stepper */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">Importar Extrato</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {step === "upload" && "Selecione um arquivo OFX ou CSV do seu banco"}
              {step === "categorize" && `${rows.length} transações em "${fileName}" — revise e importe`}
              {step === "done" && `${importedCount} transações importadas`}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1 border-b border-border bg-muted/30 px-6 py-2.5">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                  i < stepIdx ? "bg-green-500 text-white" : i === stepIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {i < stepIdx ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={`text-xs ${i === stepIdx ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                {LABELS[s]}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="mx-1 h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* STEP 1 — Upload */}
          {step === "upload" && (
            <div className="flex min-h-80 flex-col items-center justify-center gap-6 p-10">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => fileRef.current?.click()}
                className={`flex w-full max-w-md cursor-pointer flex-col items-center gap-5 rounded-2xl border-2 border-dashed p-12 transition-colors ${
                  isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/30"
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                  <Upload className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Arraste o arquivo aqui</p>
                  <p className="mt-1 text-sm text-muted-foreground">ou clique para selecionar</p>
                </div>
                <div className="flex gap-2">
                  {[".ofx", ".csv", ".txt"].map((ext) => (
                    <span key={ext} className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">{ext}</span>
                  ))}
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".ofx,.ofc,.csv,.txt"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
              {parseError && (
                <div className="flex max-w-md items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Categorize */}
          {step === "categorize" && (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
                <span className="text-xs font-medium text-muted-foreground">Conta deste extrato:</span>
                <select
                  value={bankId ?? ""}
                  onChange={(e) => setBankId(e.target.value ? Number(e.target.value) : null)}
                  className="rounded-lg border border-border bg-popover px-2 py-1.5 text-xs"
                >
                  <option value="">Sem conta</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
                  ))}
                </select>
                <span className="ml-auto text-xs text-muted-foreground">{toImport.length}/{rows.length} selecionadas</span>
              </div>

              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
                  <tr className="border-b border-border">
                    <th className="w-10 py-3 pl-4 text-left">
                      <input
                        type="checkbox"
                        checked={rows.every((r) => !r.skip)}
                        onChange={(e) => setRows((prev) => prev.map((r) => ({ ...r, skip: !e.target.checked })))}
                        className="accent-primary"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Descrição</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Categoria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.id} className={`transition-colors hover:bg-accent/20 ${row.skip ? "opacity-35" : ""}`}>
                      <td className="py-2.5 pl-4">
                        <input
                          type="checkbox"
                          checked={!row.skip}
                          onChange={(e) => update(row.id, { skip: !e.target.checked })}
                          className="accent-primary"
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                        {new Date(row.date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className="max-w-[220px] px-4 py-2.5">
                        <span className="block truncate text-xs" title={row.description}>{row.description}</span>
                      </td>
                      <td className={`whitespace-nowrap px-4 py-2.5 text-right text-xs font-semibold tabular-nums ${row.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                        {row.type === "income" ? "+" : "-"}{formatBRL(Math.abs(row.amount))}
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={row.type}
                          disabled={row.skip}
                          onChange={(e) => {
                            const type = e.target.value as TxType;
                            update(row.id, { type, categoryId: null, isCardPayment: false });
                          }}
                          className="w-24 rounded-md border border-border bg-muted px-1.5 py-1 text-xs"
                        >
                          <option value="expense">Despesa</option>
                          <option value="income">Receita</option>
                        </select>
                      </td>
                      <td className="px-4 py-2.5">
                        {row.isCardPayment ? (
                          <select
                            value={row.cardId ?? ""}
                            disabled={row.skip}
                            onChange={(e) => update(row.id, { cardId: e.target.value ? Number(e.target.value) : null })}
                            className="w-40 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-1 text-xs text-amber-800"
                          >
                            <option value="">💳 Fatura de qual cartão?</option>
                            {cards.map((c) => (
                              <option key={c.id} value={c.id}>💳 {c.name}</option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={row.categoryId ?? ""}
                            disabled={row.skip}
                            onChange={(e) => update(row.id, { categoryId: e.target.value ? Number(e.target.value) : null })}
                            className="w-40 rounded-md border border-border bg-muted px-1.5 py-1 text-xs"
                          >
                            <option value="">Sem categoria</option>
                            {categories.filter((c) => c.kind === row.type).map((c) => (
                              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* STEP 3 — Done */}
          {step === "done" && (
            <div className="flex min-h-64 flex-col items-center justify-center gap-5 p-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold">Importação concluída!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {importedCount} transação{importedCount !== 1 ? "ões adicionadas" : " adicionada"} com sucesso.
                </p>
              </div>
              <button onClick={onClose} className="mt-1 rounded-xl bg-primary px-7 py-2.5 font-medium text-primary-foreground hover:bg-primary/90">
                Fechar
              </button>
            </div>
          )}
        </div>

        {/* footer */}
        {step === "categorize" && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-3">
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{toImport.length}</span> de {rows.length} selecionadas
            </div>
            {parseError && (
              <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{parseError}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setStep("upload"); setRows([]); }} className="rounded-xl border border-border px-4 py-2 text-xs text-muted-foreground hover:bg-accent">
                Trocar arquivo
              </button>
              <button
                onClick={handleImport}
                disabled={importing || toImport.length === 0}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                {importing && <RefreshCw className="h-3 w-3 animate-spin" />}
                {importing ? "Importando…" : `Importar ${toImport.length}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

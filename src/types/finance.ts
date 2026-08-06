export type TxType = "income" | "expense";
export type CategoryKind = TxType;

export interface Category {
  id: number;
  name: string;
  icon: string;
  kind: CategoryKind;
  /** limite mensal de gasto; null significa sem limite */
  monthly_limit: number | null;
}

export interface Bank {
  id: number;
  name: string;
  icon: string;
  opening_balance: number;
  /** conexão da Pluggy que alimenta esta conta (null quando é manual) */
  pluggy_item_id: string | null;
  /** conta da Pluggy vinculada; é o que evita duplicar a conta no re-sync */
  pluggy_account_id: string | null;
  /** true quando as transações chegam sozinhas pelo Open Finance */
  is_auto: boolean;
  last_synced_at: string | null;
}

export interface CreditCard {
  id: number;
  name: string;
  bank_id: number | null;
  credit_limit: number;
  opening_invoice: number;
  closing_day: number | null;
  due_day: number | null;
  color: string;
  /** bandeira: visa, mastercard, elo, amex, hipercard */
  network: string | null;
  /** nome impresso no cartão */
  holder: string | null;
  /** quatro últimos dígitos; nunca o número completo */
  last4: string | null;
  /** variante: standard, gold, platinum, black. Define o tom da arte */
  tier: string | null;
}

export interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: TxType;
  category_id: number | null;
  bank_id: number | null;
  card_id: number | null;
  is_card_payment: boolean;
  occurred_on: string; // YYYY-MM-DD
  purchase_group: string | null;
  installments: number;
  installment_no: number;
  is_transfer: boolean;
  transfer_group: string | null;
  /** id da transação na origem externa; chave do dedupe junto com user_id */
  external_id: string | null;
  /** de onde veio o lançamento */
  source: TxSource;
}

export type TxSource = "manual" | "ofx" | "pluggy";

/** Conexão com uma instituição via Open Finance (Pluggy). */
export interface PluggyItem {
  id: number;
  item_id: string;
  connector_id: number | null;
  connector_name: string | null;
  connector_image: string | null;
  status: string | null;
  last_synced_at: string | null;
  created_at: string;
}

/** Banco com saldo atual calculado a partir do histórico. */
export interface BankWithBalance extends Bank {
  balance: number;
}

/** Cartão com os valores de fatura/limite calculados. */
export interface CardWithInvoice extends CreditCard {
  invoice: number;        // = fatura_mes (compat)
  fatura_mes: number;     // valor do ciclo em foco, pago ou não: o pagamento
                          // já saiu do total e o estado "Paga" é derivado à parte
  em_aberto: number;      // utilizado fora da fatura do ciclo: parcelas futuras,
                          // compras fora da janela e (com ciclo) o opening_invoice
  utilizado_total: number;// total consumindo limite
  disponivel: number;     // credit_limit - utilizado_total
  /** primeiro dia da janela da fatura; null quando o cartão não tem ciclo */
  cycle_start: string | null;
  /** dia do fechamento desta fatura; null quando o cartão não tem ciclo */
  cycle_end: string | null;
  /** data completa do vencimento desta fatura; null quando o cartão não tem dia de vencimento */
  cycle_due: string | null;
}

export interface Subscription {
  id: number;
  name: string;
  icon: string;
  amount: number;
  billing_day: number | null;
  category_id: number | null;
  bank_id: number | null;
  card_id: number | null;
  active: boolean;
}

/** Candidato detectado no histórico (ainda não é uma assinatura salva). */
export interface SubscriptionCandidate {
  key: string; // descrição normalizada (chave de dedupe)
  name: string; // descrição legível (ocorrência mais recente)
  amount: number; // valor sugerido (ocorrência mais recente)
  billing_day: number; // dia do mês mais frequente
  months: number; // em quantos meses distintos apareceu
  category_id: number | null;
  bank_id: number | null;
  card_id: number | null;
}

export interface PlannedItem {
  id: number;
  description: string;
  amount: number;
  type: TxType;
  category_id: number | null;
  bank_id: number | null;
  card_id: number | null;
  due_date: string;              // YYYY-MM-DD (data prevista)
  transaction_id: number | null; // null = a realizar; preenchido = realizado
}

/** Despesa prevista sugerida a partir de uma assinatura ativa (#7). */
export interface PlanSuggestion {
  key: string;              // nome normalizado (chave de dedupe)
  name: string;             // nome da assinatura
  amount: number;           // valor mensal da assinatura
  due_date: string;         // mês visualizado + billing_day (com clamp do dia)
  category_id: number | null;
  bank_id: number | null;
  card_id: number | null;
}

export type TxType = "income" | "expense";
export type CategoryKind = TxType;

export interface Category {
  id: number;
  name: string;
  icon: string;
  kind: CategoryKind;
}

export interface Bank {
  id: number;
  name: string;
  icon: string;
  opening_balance: number;
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
}

/** Banco com saldo atual calculado a partir do histórico. */
export interface BankWithBalance extends Bank {
  balance: number;
}

/** Cartão com os valores de fatura/limite calculados. */
export interface CardWithInvoice extends CreditCard {
  invoice: number;        // = fatura_mes (compat)
  fatura_mes: number;     // a pagar este mês
  em_aberto: number;      // parcelas de meses futuros
  utilizado_total: number;// total consumindo limite
  disponivel: number;     // credit_limit - utilizado_total
}

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
}

/** Banco com saldo atual calculado a partir do histórico. */
export interface BankWithBalance extends Bank {
  balance: number;
}

/** Cartão com o valor da fatura aberta calculado. */
export interface CardWithInvoice extends CreditCard {
  invoice: number;
}

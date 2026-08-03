import { z } from "zod";

export const txTypeSchema = z.enum(["income", "expense"]);

export const transactionInput = z.object({
  description: z.string().trim().min(1, "Descrição obrigatória"),
  amount: z.number().positive("O valor deve ser maior que zero"),
  type: txTypeSchema,
  category_id: z.number().int().nullable().default(null),
  bank_id: z.number().int().nullable().default(null),
  card_id: z.number().int().nullable().default(null),
  is_card_payment: z.boolean().default(false),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});
export type TransactionInput = z.infer<typeof transactionInput>;

export const bankInput = z.object({
  name: z.string().trim().min(1, "Nome obrigatório"),
  icon: z.string().trim().min(1).default("landmark"),
  opening_balance: z.number().default(0),
});
export type BankInput = z.infer<typeof bankInput>;

export const cardInput = z.object({
  name: z.string().trim().min(1, "Nome obrigatório"),
  bank_id: z.number().int().nullable().default(null),
  credit_limit: z.number().min(0).default(0),
  opening_invoice: z.number().min(0).default(0),
  closing_day: z.number().int().min(1).max(31).nullable().default(null),
  due_day: z.number().int().min(1).max(31).nullable().default(null),
  color: z.string().default("#3b82f6"),
});
export type CardInput = z.infer<typeof cardInput>;

export const categoryInput = z.object({
  name: z.string().trim().min(1, "Nome obrigatório"),
  icon: z.string().trim().min(1).default("tag"),
  kind: txTypeSchema,
  /** limite mensal de gasto (só faz sentido para despesa); null = sem limite */
  monthly_limit: z.number().min(0, "Limite mensal inválido").nullable().default(null),
});
export type CategoryInput = z.infer<typeof categoryInput>;

export const installmentInput = transactionInput.extend({
  installments: z.number().int().min(1).max(48).default(1),
});
export type InstallmentInput = z.infer<typeof installmentInput>;

export const transferInput = z
  .object({
    description: z.string().trim().min(1, "Descrição obrigatória"),
    amount: z.number().positive("O valor deve ser maior que zero"),
    from_bank_id: z.number().int(),
    to_bank_id: z.number().int(),
    occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  })
  .refine((v) => v.from_bank_id !== v.to_bank_id, {
    message: "Escolha contas diferentes",
    path: ["to_bank_id"],
  });
export type TransferInput = z.infer<typeof transferInput>;

export const subscriptionInput = z.object({
  name: z.string().trim().min(1, "Nome obrigatório"),
  icon: z.string().trim().min(1).default("repeat"),
  amount: z.number().positive("O valor deve ser maior que zero"),
  billing_day: z.number().int().min(1).max(31).nullable().default(null),
  category_id: z.number().int().nullable().default(null),
  bank_id: z.number().int().nullable().default(null),
  card_id: z.number().int().nullable().default(null),
  active: z.boolean().default(true),
});
export type SubscriptionInput = z.infer<typeof subscriptionInput>;

export const plannedItemInput = z.object({
  description: z.string().trim().min(1, "Descrição obrigatória"),
  amount: z.number().positive("O valor deve ser maior que zero"),
  type: txTypeSchema,
  category_id: z.number().int().nullable().default(null),
  bank_id: z.number().int().nullable().default(null),
  card_id: z.number().int().nullable().default(null),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});
export type PlannedItemInput = z.infer<typeof plannedItemInput>;

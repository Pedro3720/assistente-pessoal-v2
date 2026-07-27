"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth/session";
import { enforceRate } from "@/lib/ratelimit";
import { idParam, uuidParam } from "@/lib/validation/common";
import { shiftMonth } from "@/lib/dates";
import {
  transactionInput,
  bankInput,
  cardInput,
  categoryInput,
  installmentInput,
  transferInput,
  subscriptionInput,
  plannedItemInput,
  type TransactionInput,
} from "@/lib/validation/finance";
import type { PlannedItem } from "@/types/finance";
import { DEFAULT_CATEGORIES } from "@/lib/finance/defaults";

function revalidate() {
  revalidatePath("/financas");
  revalidatePath("/");
}

/** Compra no cartão não mexe no saldo do banco (bank_id NULL). */
function normalizeTx(input: TransactionInput): TransactionInput {
  if (input.card_id && !input.is_card_payment) {
    return { ...input, bank_id: null };
  }
  return input;
}

// ─── Categorias ───────────────────────────────────────────
export async function ensureDefaultCategories() {
  const { supabase, userId } = await requireUser();
  const { count, error } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) return;

  const rows = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId }));
  const { error: insErr } = await supabase.from("categories").insert(rows);
  if (insErr) throw new Error(insErr.message);
  revalidate();
}

export async function createCategory(raw: unknown) {
  const input = categoryInput.parse(raw);
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("categories")
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidate();
  return data;
}

export async function updateCategory(id: number, raw: unknown) {
  const rowId = idParam.parse(id);
  const input = categoryInput.partial().parse(raw);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("categories").update(input).eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteCategory(id: number) {
  const rowId = idParam.parse(id);
  const { supabase } = await requireUser();
  await supabase.from("transactions").update({ category_id: null }).eq("category_id", rowId);
  const { error } = await supabase.from("categories").delete().eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidate();
}

// ─── Contas (banks) ───────────────────────────────────────
export async function createBank(raw: unknown) {
  const input = bankInput.parse(raw);
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("banks")
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidate();
  return data;
}

export async function updateBank(id: number, raw: unknown) {
  const rowId = idParam.parse(id);
  const input = bankInput.partial().parse(raw);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("banks").update(input).eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteBank(id: number) {
  const rowId = idParam.parse(id);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("banks").delete().eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidate();
}

// ─── Cartões ──────────────────────────────────────────────
export async function createCard(raw: unknown) {
  const input = cardInput.parse(raw);
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("credit_cards")
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidate();
  return data;
}

export async function updateCard(id: number, raw: unknown) {
  const rowId = idParam.parse(id);
  const input = cardInput.partial().parse(raw);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("credit_cards").update(input).eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteCard(id: number) {
  const rowId = idParam.parse(id);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("credit_cards").delete().eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidate();
}

// ─── Transações ───────────────────────────────────────────
export async function createTransaction(raw: unknown) {
  const input = normalizeTx(transactionInput.parse(raw));
  const { supabase, userId } = await requireUser();
  await enforceRate("financeWrite", userId, "Muitas operações em finanças. Aguarde um instante.");
  const { error } = await supabase
    .from("transactions")
    .insert({ ...input, user_id: userId });
  if (error) throw new Error(error.message);
  revalidate();
}

export async function updateTransaction(id: number, raw: unknown) {
  const rowId = idParam.parse(id);
  const input = normalizeTx(transactionInput.parse(raw));
  const { supabase } = await requireUser();
  const { error } = await supabase.from("transactions").update(input).eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteTransaction(id: number) {
  const rowId = idParam.parse(id);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("transactions").delete().eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function createInstallmentPurchase(raw: unknown) {
  const parsed = installmentInput.parse(raw);
  const { installments, ...core } = parsed;
  const base = normalizeTx(core);
  const { supabase, userId } = await requireUser();
  await enforceRate("financeWrite", userId, "Muitas operações em finanças. Aguarde um instante.");

  if (installments <= 1 || !base.card_id || base.type !== "expense" || base.is_card_payment) {
    // sem parcelamento: comporta como transação normal
    const { error } = await supabase.from("transactions").insert({ ...base, user_id: userId });
    if (error) throw new Error(error.message);
    revalidate();
    return;
  }

  const { data: card } = await supabase
    .from("credit_cards")
    .select("closing_day")
    .eq("id", base.card_id)
    .single();
  const closingDay = (card?.closing_day as number | null) ?? null;

  const cents = Math.round(base.amount * 100);
  const per = Math.floor(cents / installments);
  const group = randomUUID();
  const [oy, om, od] = base.occurred_on.split("-").map(Number);
  const first = closingDay && od > closingDay ? shiftMonth(oy, om, 1) : { year: oy, month: om };

  const rows = Array.from({ length: installments }, (_, i) => {
    const k = i + 1;
    const amountCents = k === installments ? cents - per * (installments - 1) : per;
    const bm = shiftMonth(first.year, first.month, k - 1);
    const occurred_on = `${bm.year}-${String(bm.month).padStart(2, "0")}-01`;
    return {
      ...base,
      amount: amountCents / 100,
      occurred_on,
      description: `${base.description} (${k}/${installments})`,
      purchase_group: group,
      installments,
      installment_no: k,
      user_id: userId,
    };
  });

  const { error } = await supabase.from("transactions").insert(rows);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteTransactionGroup(group: string) {
  const g = uuidParam.parse(group);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("transactions").delete().eq("purchase_group", g);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function createTransfer(raw: unknown) {
  const input = transferInput.parse(raw);
  const { supabase, userId } = await requireUser();
  await enforceRate("financeWrite", userId, "Muitas operações em finanças. Aguarde um instante.");
  const group = randomUUID();
  const base = {
    description: input.description,
    amount: input.amount,
    category_id: null,
    card_id: null,
    is_card_payment: false,
    occurred_on: input.occurred_on,
    is_transfer: true,
    transfer_group: group,
    user_id: userId,
  };
  const rows = [
    { ...base, type: "expense" as const, bank_id: input.from_bank_id },
    { ...base, type: "income" as const, bank_id: input.to_bank_id },
  ];
  const { error } = await supabase.from("transactions").insert(rows);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteTransferGroup(group: string) {
  const g = uuidParam.parse(group);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("transactions").delete().eq("transfer_group", g);
  if (error) throw new Error(error.message);
  revalidate();
}

/** Importação em lote (OFX/CSV). */
export async function bulkCreateTransactions(raw: unknown) {
  const arr = transactionInput.array().parse(raw);
  const { supabase, userId } = await requireUser();
  await enforceRate("financeWrite", userId, "Muitas operações em finanças. Aguarde um instante.");
  const rows = arr.map((t) => ({ ...normalizeTx(t), user_id: userId }));
  const { error } = await supabase.from("transactions").insert(rows);
  if (error) throw new Error(error.message);
  revalidate();
}

// ─── Assinaturas ──────────────────────────────────────────
export async function createSubscription(raw: unknown) {
  const input = subscriptionInput.parse(raw);
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("subscriptions")
    .insert({ ...input, user_id: userId });
  if (error) throw new Error(error.message);
  revalidate();
}

export async function updateSubscription(id: number, raw: unknown) {
  const rowId = idParam.parse(id);
  const input = subscriptionInput.partial().parse(raw);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("subscriptions").update(input).eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteSubscription(id: number) {
  const rowId = idParam.parse(id);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("subscriptions").delete().eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidate();
}

// ─── Planejamento mensal ──────────────────────────────────
export async function createPlannedItem(raw: unknown) {
  const input = plannedItemInput.parse(raw);
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("planned_items")
    .insert({ ...input, user_id: userId });
  if (error) throw new Error(error.message);
  revalidate();
}

export async function updatePlannedItem(id: number, raw: unknown) {
  const rowId = idParam.parse(id);
  const input = plannedItemInput.partial().parse(raw);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("planned_items").update(input).eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deletePlannedItem(id: number) {
  const rowId = idParam.parse(id);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("planned_items").delete().eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidate();
}

/** Lança a transação real a partir do item e vincula (transaction_id). */
export async function realizePlannedItem(id: number) {
  const rowId = idParam.parse(id);
  const { supabase, userId } = await requireUser();
  const { data, error: readErr } = await supabase
    .from("planned_items")
    .select("*")
    .eq("id", rowId)
    .single();
  if (readErr) throw new Error(readErr.message);
  const item = data as PlannedItem;
  if (item.transaction_id != null) return; // já realizado

  const txInput = normalizeTx({
    description: item.description,
    amount: Number(item.amount),
    type: item.type,
    category_id: item.category_id,
    bank_id: item.bank_id,
    card_id: item.card_id,
    is_card_payment: false,
    occurred_on: item.due_date,
  });

  const { data: tx, error: insErr } = await supabase
    .from("transactions")
    .insert({ ...txInput, user_id: userId })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);

  // Vínculo atômico: só casa se o item ainda estiver pendente (transaction_id null).
  // Em corrida (duplo clique), a 2ª chamada casa 0 linhas e desfaz a própria transação,
  // evitando dois lançamentos e uma transação órfã.
  const { data: linked, error: linkErr } = await supabase
    .from("planned_items")
    .update({ transaction_id: (tx as { id: number }).id })
    .eq("id", rowId)
    .is("transaction_id", null)
    .select("id");
  if (linkErr || !linked || linked.length === 0) {
    await supabase.from("transactions").delete().eq("id", (tx as { id: number }).id);
    if (linkErr) throw new Error(linkErr.message);
    return; // item já realizado por outra chamada — evita transação duplicada
  }
  revalidate();
}

/** Desfaz: remove a transação vinculada (a FK on delete set null volta o item a pendente). */
export async function unrealizePlannedItem(id: number) {
  const rowId = idParam.parse(id);
  const { supabase } = await requireUser();
  const { data, error: readErr } = await supabase
    .from("planned_items")
    .select("transaction_id")
    .eq("id", rowId)
    .single();
  if (readErr) throw new Error(readErr.message);
  const txId = (data as { transaction_id: number | null }).transaction_id;
  if (txId == null) return;
  const { error } = await supabase.from("transactions").delete().eq("id", txId);
  if (error) throw new Error(error.message);
  revalidate();
}

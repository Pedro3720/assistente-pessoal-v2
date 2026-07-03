"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  transactionInput,
  bankInput,
  cardInput,
  categoryInput,
  type TransactionInput,
} from "@/lib/validation/finance";
import { DEFAULT_CATEGORIES } from "@/lib/finance/defaults";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, userId: user.id };
}

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
  const { supabase, userId } = await ctx();
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
  const { supabase, userId } = await ctx();
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
  const input = categoryInput.partial().parse(raw);
  const { supabase } = await ctx();
  const { error } = await supabase.from("categories").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteCategory(id: number) {
  const { supabase } = await ctx();
  await supabase.from("transactions").update({ category_id: null }).eq("category_id", id);
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

// ─── Contas (banks) ───────────────────────────────────────
export async function createBank(raw: unknown) {
  const input = bankInput.parse(raw);
  const { supabase, userId } = await ctx();
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
  const input = bankInput.partial().parse(raw);
  const { supabase } = await ctx();
  const { error } = await supabase.from("banks").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteBank(id: number) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("banks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

// ─── Cartões ──────────────────────────────────────────────
export async function createCard(raw: unknown) {
  const input = cardInput.parse(raw);
  const { supabase, userId } = await ctx();
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
  const input = cardInput.partial().parse(raw);
  const { supabase } = await ctx();
  const { error } = await supabase.from("credit_cards").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteCard(id: number) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("credit_cards").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

// ─── Transações ───────────────────────────────────────────
export async function createTransaction(raw: unknown) {
  const input = normalizeTx(transactionInput.parse(raw));
  const { supabase, userId } = await ctx();
  const { error } = await supabase
    .from("transactions")
    .insert({ ...input, user_id: userId });
  if (error) throw new Error(error.message);
  revalidate();
}

export async function updateTransaction(id: number, raw: unknown) {
  const input = normalizeTx(transactionInput.parse(raw));
  const { supabase } = await ctx();
  const { error } = await supabase.from("transactions").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteTransaction(id: number) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

/** Importação em lote (OFX/CSV). */
export async function bulkCreateTransactions(raw: unknown) {
  const arr = transactionInput.array().parse(raw);
  const { supabase, userId } = await ctx();
  const rows = arr.map((t) => ({ ...normalizeTx(t), user_id: userId }));
  const { error } = await supabase.from("transactions").insert(rows);
  if (error) throw new Error(error.message);
  revalidate();
}

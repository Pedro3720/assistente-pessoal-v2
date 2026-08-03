-- ─── ORÇAMENTO POR CATEGORIA (Onda 18) ─────────────────────
-- Limite mensal de gasto por categoria.
--
-- Nulo significa "sem limite", que é exatamente o comportamento de hoje e
-- segue sendo o padrão: nenhuma categoria existente muda de estado.
--
-- Tipo idêntico ao de credit_cards.credit_limit (numeric(12,2)), para
-- dinheiro não passar a ter duas escalas diferentes no schema.
--
-- A política RLS "own_rows" de public.categories é "for all" sobre a linha
-- (using auth.uid() = user_id), então a coluna nova já nasce coberta e
-- nenhuma política precisa ser recriada.

alter table public.categories
  add column if not exists monthly_limit numeric(12,2);

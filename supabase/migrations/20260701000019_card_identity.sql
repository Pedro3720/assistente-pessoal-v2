-- supabase/migrations/20260701000019_card_identity.sql
-- ─── IDENTIDADE DO CARTÃO (Onda 19) ────────────────────────
-- Campos que permitem desenhar o cartão parecido com o real.
-- Todos opcionais: cartão existente continua válido sem nenhum deles.
-- NUNCA guardamos número completo, CVV ou validade.

alter table public.credit_cards
  add column if not exists network text
    check (network is null or network in
      ('visa', 'mastercard', 'elo', 'amex', 'hipercard')),
  add column if not exists holder text,
  add column if not exists last4 text
    check (last4 is null or last4 ~ '^[0-9]{4}$'),
  add column if not exists tier text
    check (tier is null or tier in
      ('standard', 'gold', 'platinum', 'black'));

notify pgrst, 'reload schema';

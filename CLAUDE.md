# Instruções do projeto — Zênite Assistente Pessoal (v2)

> Leia o `HANDOFF.md` inteiro antes de agir (estado do projeto, o que falta, como continuar).
> Contexto histórico detalhado em `CONTEXT.md`.

## Regras de escrita (texto visível ao usuário)

- **NUNCA use travessão `—` (em dash) nem `–` (en dash) em texto visível ao usuário**
  (UI, labels, placeholders, toasts, e-mails, mensagens de erro). É uma marca de texto
  gerado por IA e o dono do projeto não quer.
- No lugar do travessão, prefira: **vírgula**, **ponto**, **dois-pontos**, **parênteses**
  ou a conjunção **"e"** — o que fizer a frase soar mais natural em pt-BR.
- Hífen simples `-` é permitido quando for hífen de verdade (palavras compostas, faixas de
  data como `2026-07-22`, placeholders curtos tipo `"-"`).
- Antes de finalizar qualquer mudança que toque em texto visível, faça uma varredura:
  `rg "—|–" src` e garanta que nenhum caractere desses aparece em string de UI.

## Convenções técnicas

Ver `HANDOFF.md` seção 5 ("Regras de ouro") para arquitetura (Server Components leem /
Server Actions mutam, RLS `own_rows`, datas via `src/lib/dates.ts`, dinheiro via
`src/lib/money.ts`, modais via `components/ui/modal.tsx`, etc.).

- Validação de cada mudança: **`npm run build`** (não há framework de testes) + verificação
  manual no app. A CLI do Supabase é bloqueada nesta máquina: migrações são rodadas
  manualmente colando o SQL no Supabase → SQL Editor.

# Onda 20: categoria no pagamento de fatura do cartão

Data: 2026-08-06
Status: spec aprovado, aguardando plano de implementação

## 1. Objetivo

Permitir escolher uma categoria ao lançar o pagamento da fatura do cartão, e
fazer esse pagamento contar como despesa nos totais, como qualquer outra.

## 2. O estado atual

A coluna `category_id` já existe em `transactions` e a Server Action já a
aceita. O que impede é a interface e três exclusões deliberadas:

| Lugar | O que faz hoje |
|---|---|
| `src/components/finance/transactions-section.tsx:396` | Esconde o campo de categoria quando "Pagamento de fatura" está marcado |
| `src/app/(app)/financas/page.tsx:200` | O laço do donut pula `is_card_payment` |
| `src/lib/data/finance.ts:125` | `totals.expense` pula `is_card_payment` |
| `src/lib/data/finance.ts:509` | A série de saídas por mês pula `is_card_payment` |

As exclusões existiam por uma razão contábil: a compra no cartão já entra na
categoria dela, e contar o pagamento de novo conta o mesmo gasto duas vezes.

O dono já tem uma categoria "Pagamento de fatura" cadastrada, com zero
movimentações: o app antecipou a necessidade e nunca ligou o fio.

## 3. Decisões tomadas

| Tema | Decisão |
|---|---|
| Pagamento nos totais | Conta como despesa normal |
| Pagamento sem categoria | Também conta, entrando como "Sem categoria" |
| Histórico | Sem migração: os pagamentos já lançados passam a contar de imediato |
| Importação | Continua trazendo pagamento sem categoria |
| Cálculo da fatura | Não muda |

**A dupla contagem é escolha consciente do dono**, tomada depois de ela ser
apresentada com exemplo numérico. Não é efeito colateral não percebido, e está
registrada aqui para quem ler o histórico entender por que os totais somam o
mesmo gasto duas vezes.

## 4. O que muda

### 4.1 Formulário

O campo de categoria deixa de ser escondido quando "Pagamento de fatura" está
marcado. É a única mudança de interface.

### 4.2 Agregados de despesa

As três exclusões de `is_card_payment` listadas na seção 2 saem. Passam a
contar:

- o donut de despesas por categoria e a legenda dele;
- `totals.expense`, que alimenta o Dashboard e o total do mês;
- a série do gráfico de saídas por mês.

### 4.3 Exibição no extrato: nada a fazer

A primeira versão deste spec dizia que `src/components/finance/statement.tsx`
precisava passar a mostrar a categoria. **Ele já faz isso.** Ao escrever o plano,
a leitura do código real mostrou:

```tsx
const label = cat
  ? cat.name
  : t.is_card_payment
    ? "Pagamento de fatura"
    : "Sem categoria";
```

Como `cat` vem de `t.category_id ? catById.get(t.category_id) : null`, um
pagamento com categoria já exibe o nome dela, e o rótulo fixo só aparece na
ausência de categoria. É exatamente o comportamento desejado.

O erro veio de escrever esta seção a partir de um grep raso, sem abrir o arquivo.
Fica registrado como correção em vez de apagado, porque quem ler o plano vai ver
a mesma observação e é melhor que os dois documentos concordem.

## 5. O que NÃO muda

**O cálculo da fatura, em `src/lib/finance/invoice.ts`.** O pagamento continua
abatendo `utilizado_total` (que é saldo de limite) e continua fora do valor do
ciclo. Essa separação foi a correção Critical da Onda 19: aplicar o pagamento
dentro da janela do ciclo zerava a fatura seguinte em todo cartão com
fechamento e vencimento preenchidos. **Nenhuma alteração desta onda pode tocar
esse arquivo.**

Também não mudam: limite, disponível, estado da fatura, e a exclusão de
transferências dos totais (dinheiro trocando de bolso não é despesa).

## 6. Consequências esperadas

Todas são efeito direto da decisão da seção 3, não regressão:

- Os totais de despesa sobem em todo mês que tenha pagamento de fatura lançado.
- O Dashboard muda em "Despesas" e "Saldo do mês".
- O donut ganha uma fatia "Sem categoria" grande, com todos os pagamentos já
  lançados, até o dono ir preenchendo.
- O gráfico de saídas por mês sobe nos meses com pagamento.

## 7. Fora de escopo

- Migração do histórico para atribuir categoria aos pagamentos existentes.
- Mudança na regra de importação.
- Qualquer alteração no cálculo de fatura, limite ou ciclo.

## 8. Riscos

| Risco | Situação |
|---|---|
| Dupla contagem do mesmo gasto | Escolhida conscientemente. A volta é reverter as três exclusões da seção 4.2 |
| Números históricos mudam sem aviso | Mitigado pelo registro no HANDOFF e por este spec |
| Alguém "corrigir" a fatura junto | Mitigado pela seção 5, que proíbe tocar em `invoice.ts` |

## 9. Validação

- `npm run build` (não há framework de testes no projeto).
- Lançar um pagamento de fatura com categoria e conferir que ele aparece no
  donut, no total do mês e na série mensal.
- Conferir que a fatura do cartão, o limite e o disponível continuam iguais aos
  de antes da mudança.
- Varredura de travessão: `rg "—|–" src`, sem ocorrência em string de UI.
- Registro no `HANDOFF.md` antes de encerrar.

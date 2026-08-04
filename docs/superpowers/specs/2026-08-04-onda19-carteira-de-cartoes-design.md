# Onda 19: carteira de cartões (aba Cartões em Finanças)

Data: 2026-08-04
Status: spec aprovado, aguardando plano de implementação

## 1. Objetivo

Transformar a aba Cartões de uma listagem de texto numa carteira: os cartões
empilhados com arte própria, um em foco por vez, e abaixo dele tudo que importa
sobre aquele cartão (fatura, limite, datas, movimentações, parcelamentos e o que
já está comprometido à frente).

O pedido veio com uma referência visual de carteira empilhada e com o desejo de
que cada cartão se pareça com o cartão real correspondente.

## 2. Decisões tomadas

| Tema | Decisão |
|---|---|
| Escopo | Só a aba Cartões. Ajustes da Visão geral ficam para outra onda |
| Arte do cartão | Composta pelo app a partir do emissor, não replicada do cartão físico |
| Campos novos | Bandeira, titular, quatro últimos dígitos e variante |
| Interação | O cartão escolhido sobe ao topo da pilha e abre o detalhe abaixo |
| Recorte das movimentações | Ciclo de fatura, não mês-calendário |
| Alcance do ciclo | O ciclo passa a valer no app inteiro, não só na aba |
| Detalhe | Fatura, limite, datas, movimentações, parcelamentos, projeção e gerenciar |
| Bloco de contas | Sai da aba Cartões e ganha uma aba Contas própria |
| Logos de bandeira | O dono fornece os SVGs oficiais antes da implementação |

## 3. Dados

### 3.1 Migração

Quatro colunas novas em `credit_cards`, todas opcionais. Arquivo:
`supabase/migrations/20260701000019_card_identity.sql`.

```sql
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
```

A política RLS `own_rows` de `credit_cards` é "for all" sobre a linha, então as
colunas novas já nascem cobertas.

### 3.2 O que é derivado

**Melhor dia de compra** é `closing_day + 1`, com ajuste quando o mês seguinte é
mais curto. Não vira coluna: é função de um dado que já existe, e coluna
redundante é coluna que sai de sincronia.

### 3.3 O que nunca é guardado

Número completo do cartão, CVV e validade não entram no schema nem no
formulário. Só os quatro últimos dígitos, que é o que aparece em comprovante e
serve para distinguir dois cartões do mesmo emissor.

## 4. Arte do cartão

Um componente só, `<CardArt card size="stack" | "hero" />`, compondo de trás
para frente:

1. **Proporção 1.586:1**, a do cartão físico (ISO/IEC 7810 ID-1). É o detalhe
   mais barato que faz a peça ler como cartão.
2. **Fundo** derivado da cor de marca do banco (`BANKS[slug].cor`, que já existe
   para 28 emissores), modulado pela variante:
   - `standard`: cor da marca cheia, gradiente sutil
   - `gold`: realces puxados para dourado
   - `platinum`: cor dessaturada para grafite
   - `black`: quase preto, com o realce na cor da marca
   Isso é o que permite um Inter Black e um Inter Gold conviverem sem exigir
   arte por produto.
3. **Brilho diagonal** em gradiente CSS, sem imagem, para não pesar no bundle.
4. **Logo do banco** no topo à esquerda, de `public/banks/<slug>.svg`.
5. **Número mascarado** ao centro-baixo, tabular.
6. **Titular** na base à esquerda, caixa alta com tracking largo.
7. **Bandeira** na base à direita, de `public/networks/<network>.svg`.

A cor do texto é escolhida pela luminância do fundo, com a mesma função já usada
no avatar de cartão da Onda 18, então nenhuma combinação nasce ilegível.

**Degradação:** cartão sem banco vinculado usa a cor de `CARD_COLORS` que já
tem hoje, sem logo. Bandeira sem arquivo correspondente cai num rótulo de texto
("VISA"). Nada quebra por asset faltando, mesmo com os SVGs sendo fornecidos
antes da implementação.

**Sobre marca:** usar o logo do emissor para identificar o cartão do próprio
usuário é uso nominativo, o mesmo que o app já faz com bancos. Redesenhar o
cartão para imitar o físico seria copiar trade dress de terceiro, e é por isso
que a arte é composta, não replicada.

## 5. Ciclo de fatura

Hoje `closing_day` e `due_day` são guardados mas nenhum cálculo os usa: são
texto na tela. `fatura_mes` em `src/lib/data/finance.ts` é o saldo acumulado até
o fim do mês-calendário visualizado. Esta onda implementa o ciclo de verdade.

### 5.1 A regra

Lib nova, `src/lib/finance/billing-cycle.ts`, com funções puras e sem acesso a
banco:

```
cycleWindow(closingDay, dueDay, year, month) -> { start, end }
bestPurchaseDay(closingDay) -> number
```

Dado um `closingDay` c, um `dueDay` d e o mês em que a fatura **vence**:

- Se `c < d`: a fatura fecha no dia c do próprio mês do vencimento.
- Se `c >= d`: a fatura fecha no dia c do mês **anterior** ao vencimento.

A janela vai do dia seguinte ao fechamento anterior até o fechamento atual,
inclusive nas duas pontas.

Nos cartões reais do dono, a fatura de agosto de 2026 fica assim:

| Cartão | Fecha | Vence | Janela da fatura de agosto |
|---|---|---|---|
| Inter | 5 | 12 | 06/07 a 05/08 |
| Bradesco | 29 | 8 | 30/06 a 29/07 |
| Mercado Pago | 2 | 7 | 03/07 a 02/08 |
| Renner | 26 | 10 | 27/06 a 26/07 |

**Mês curto:** quando o mês tem menos dias que `closing_day`, o fechamento cai
no último dia do mês. Fevereiro não quebra.

**Cartão incompleto:** sem `closing_day` ou sem `due_day`, o cartão cai no
mês-calendário, que é exatamente o comportamento de hoje. Nenhum cartão fica sem
resposta.

### 5.2 O que muda no cálculo existente

`fatura_mes` passa a ser a soma das despesas do cartão dentro da janela do
ciclo, menos os pagamentos de fatura na mesma janela.

`utilizado_total` e `disponivel` não mudam: continuam acumulados sobre a vida
toda do cartão, porque limite é consumido por saldo, não por ciclo.

**`opening_invoice` fica fora do ciclo.** A fatura que já existia quando o app
começou a acompanhar não pertence a ciclo nenhum: ela continua consumindo limite
em `utilizado_total`, mas sai do valor da fatura do ciclo. Sem essa regra, ela
reapareceria em toda fatura e inflaria todas.

## 6. A carteira

- Pilha vertical com sobreposição de cerca de 56px, o bastante para a faixa
  superior de cada cartão mostrar logo e nome.
- O cartão selecionado sobe ao topo em tamanho `hero`; os demais ficam atrás,
  levemente reduzidos e mais apagados.
- Trocar de cartão é um toque, com transição curta de posição e cor.
- Navegável por teclado: setas percorrem a pilha, Enter abre, foco visível.
- Sem teto artificial de cartões: a pilha rola.
- `+ Adicionar` sai da listagem e vira ação do cabeçalho do painel.

No celular é a mesma coisa, sem layout alternativo: a metáfora de carteira
nasceu em tela estreita e o `AppFrame` já trata a diferença de scroll.

## 7. O detalhe do cartão

Abaixo do cartão aberto, nesta ordem:

1. **Fatura do ciclo** em destaque, com "fecha DD/MM, vence DD/MM" abaixo e o
   estado. Os três estados são determinados assim, sem campo novo no banco:
   - **Aberta:** hoje é anterior ao fechamento do ciclo. Ainda entra compra.
   - **Fechada:** hoje é posterior ao fechamento e não há pagamento registrado
     que cubra o valor. É o estado que pede ação.
   - **Paga:** existe transação de pagamento de fatura (`is_card_payment`) na
     janela entre o fechamento e o vencimento, somando o valor da fatura ou
     mais. Pagamento parcial mantém a fatura como fechada e mostra o quanto
     resta.
2. **Limite**, com o `Meter` da Onda 18: percentual consumido à esquerda,
   disponível à direita, barra travando em 100% no estouro.
3. **Três datas** lado a lado: melhor dia de compra, fechamento, vencimento.
4. **Movimentações da fatura**, no `DataTable` da aba Transações, com
   `BrandAvatar`, `CategoryChip` e `Money`. Nenhum componente novo.
5. **Parcelamentos em aberto**, com "parcela 3 de 10", valor da parcela e quanto
   falta no total. O dado vem da estrutura de parcelamento que já existe.
6. **Próximas faturas**, seis ciclos à frente, com o valor já comprometido por
   parcelas futuras e assinaturas vinculadas ao cartão.
7. **Gerenciar**, com editar e excluir no rodapé, saindo dos ícones soltos de
   hoje.

**A projeção é um piso, não uma previsão.** Ela só enxerga o que já está
lançado: parcelas futuras e assinaturas. Não adivinha gasto novo. A tela diz
isso com todas as letras, porque um número que parece completo sem ser é pior
que número nenhum.

## 8. O que muda fora da aba

- **Aba Contas nova**, recebendo o bloco de contas que hoje ocupa o topo da aba
  Cartões. A barra passa a ser: Visão geral, Transações, Contas, Cartões,
  Agendadas, Recorrentes. Isso também devolve à criação de conta um lugar óbvio.
- **Rail da Visão geral:** o card Cartões continua como resumo, mas cada linha
  vira link para a aba com aquele cartão já aberto, e o avatar de iniciais dá
  lugar a uma miniatura do `CardArt`.
- **Dashboard:** "Faturas abertas" passa a somar por ciclo. O valor exibido hoje
  vai mudar, porque o de hoje ignora o ciclo.
- **`CardManager` atual:** aposentado. O formulário migra para o modal de cartão,
  agora com bandeira, titular, quatro dígitos e variante.

## 9. Fora de escopo

- Ajustes da Visão geral (gráfico de saídas com meses vazios, donut de uma
  categoria só, duplicação entre rail e aba). Viram onda própria.
- Migração visual das telas fora de Finanças.
- Qualquer forma de captura de número completo, CVV ou validade.
- Projeção que estime gasto futuro não lançado.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Valores mudam no Dashboard e no rail ao ligar o ciclo | É correção, não regressão: o número atual ignora o ciclo. Conferir os totais logo após a fase do ciclo |
| `opening_invoice` fora do ciclo pode não bater com o entendimento do dono | Regra explícita na seção 5.2; se estiver errada, muda antes da implementação |
| Logos de bandeira dependem do dono | A arte tem fallback de texto e não trava a implementação |
| Projeção parcial parecer completa | Rótulo explícito na tela dizendo que é piso |
| Ciclo mal calculado em mês curto ou virada de ano | Funções puras e isoladas em `billing-cycle.ts`, com os casos reais dos cartões do dono como conferência |

## 11. Validação

- `npm run build` a cada fase (não há framework de testes no projeto).
- Conferência manual: abrir cada cartão real e comparar a janela da fatura e o
  total com o app do banco correspondente.
- Varredura de travessão: `rg "—|–" src`, sem ocorrência em string de UI.
- Conferência nos dois temas, em desktop e celular.
- Registro da onda no `HANDOFF.md` antes de encerrar.

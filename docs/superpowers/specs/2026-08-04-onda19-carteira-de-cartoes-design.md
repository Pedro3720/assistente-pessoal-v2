# Onda 19: carteira de cartões (aba Cartões em Finanças)

Data: 2026-08-04
Status: spec aprovado, aguardando plano de implementação

## 1. Objetivo

Transformar a aba Cartões de uma listagem de texto numa carteira: os cartões em
leque, com arte própria, um em foco por vez, e abaixo dele tudo que importa sobre
aquele cartão (fatura, limite, datas, movimentações, parcelamentos e o que já
está comprometido à frente).

O pedido veio com duas referências visuais, uma de carteira e outra de galeria em
leque que se abre em grade, e com o desejo de que cada cartão se pareça com o
cartão real correspondente.

## 2. Decisões tomadas

| Tema | Decisão |
|---|---|
| Escopo | Só a aba Cartões. Ajustes da Visão geral ficam para outra onda |
| Arte do cartão | Composta pelo app a partir do emissor, não replicada do cartão físico |
| Campos novos | Bandeira, titular, quatro últimos dígitos e variante |
| Interação | Três estados: leque vertical, grade com todos, e cartão aberto com o detalhe abaixo |
| Selo do emissor | Entra na proporção original, sem achatar em branco |
| Edições na fatura | Categoria da movimentação e título do parcelamento, editáveis na própria linha |
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
4. **Selo do emissor** no topo à esquerda, de `public/banks/<slug>.svg`. Esse
   arquivo já é um selo quadrado (viewBox 108x108) com o fundo na cor da marca e
   o símbolo em branco, e o próprio gerador deixa o formato para o CSS decidir.
   Ele entra na arte **com a proporção original e sem filtro de cor**,
   arredondado por CSS. Preservar o selo é o que mantém a identidade de emissores
   cujo símbolo não sobrevive achatado em branco, e é o mesmo formato que o app
   já usa na lista de contas, então o cartão e a conta passam a mostrar a mesma
   marca.
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

### 4.1 Biblioteca de emissores completa

O projeto já consome `@edusites/bancos-brasil` (MIT) através de
`scripts/gen-banks.mjs`, que gera `public/banks/<slug>.svg` e a lista em
`src/lib/finance/banks.ts`. Só que o gerador tem uma lista curada de 28 emissores
enquanto o pacote oferece 41.

Esta onda estende a lista para os 41, incorporando os 13 que faltavam: Cora,
InfinitePay, Wise, PayPal, Stripe, Revolut, Efibank, Ton, Iugu, Asaas, NG Cash,
Avenue e Nomad. São fintechs e meios de pagamento, justamente o tipo de emissor
que hoje cai no fallback sem logo.

O trabalho é editar a lista `BANCOS` em `scripts/gen-banks.mjs`, rodar o gerador
e commitar os SVGs novos junto com o `banks.ts` regenerado. O arquivo continua
gerado, nunca editado à mão.

### 4.2 Emissores extras, fora do pacote

Alguns emissores não existem em `@edusites/bancos-brasil`: Renner é o caso do
próprio dono. Como `src/lib/finance/banks.ts` é gerado e traz o aviso "NAO EDITAR
A MAO", acrescentar um emissor ali seria perdido na próxima regeração.

A solução é uma lista paralela, `src/lib/finance/banks-extra.ts`, escrita à mão,
com o mesmo formato (`slug`, `nome`, `cor`) e assets em `public/banks/`. O
consumidor passa a ler da união das duas listas, com a lista gerada tendo
precedência em caso de slug repetido, para o pacote continuar sendo a fonte
preferencial.

Isso resolve o problema de forma permanente: qualquer emissor que o pacote não
cubra entra pela lista extra sem brigar com o gerador.

**A arte de emissor extra só existe quando o arquivo existe.** Ele é fornecido
pelo dono, a partir do material de marca do próprio emissor. Sem arquivo, o
cartão cai na cor de `CARD_COLORS` com o nome em texto, que é o comportamento
correto e previsto.

O carregador aceita `public/banks/<slug>.svg` **ou** `<slug>.png`, nesta ordem de
preferência. Vetor é melhor por escalar sem perda, mas exigir vetor travaria a
adição de emissores cujo material de marca só existe em bitmap.

**Renner é o primeiro caso.** O dono forneceu o selo (círculo vermelho com o "r"
branco), no mesmo formato dos selos gerados. O arquivo precisa ser salvo em
`public/banks/renner.png` (ou `.svg`, se houver vetor) e a entrada
`{ slug: "renner", nome: "Renner", cor: "#E30613" }` acrescentada a
`banks-extra.ts`. Enquanto o arquivo não estiver no repositório, o cartão segue
no fallback.

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

Três estados, ligados por transição de elemento compartilhado.

**Estado 1, leque vertical.** Os cartões ficam alinhados no mesmo eixo
horizontal, centralizados, e escalonados para baixo com cerca de 38px entre um e
outro. O de baixo fica à frente, então cada cartão acima mostra exatamente a
própria faixa superior, que é onde mora o selo do banco: você enxerga a marca de
todos de uma vez. A inclinação é discreta, poucos graus alternados, só para não
parecer uma pilha de software. Passar o mouse levanta o cartão e o traz à frente.

O leque mostra no máximo quatro cartões. Havendo mais, um botão "Ver todos os N
cartões" aparece **abaixo da pilha, em fluxo normal**, nunca sobreposto a ela.
Isso não é detalhe de estilo: no protótipo esse botão estava posicionado sobre a
área do quarto cartão, e a regra de `z-index` que levanta o cartão no hover
passava por cima dele, tornando-o inclicável. Elemento de ação não divide espaço
com elemento que se move.

**Estado 2, grade.** O botão do contador abre todos os cartões numa grade
responsiva, em tamanho médio, para escolher olhando. Dali, clicar num cartão vai
direto para o estado aberto. Um botão volta ao leque.

**Estado 3, cartão aberto.** O cartão escolhido aparece em destaque no topo, e
todos os cartões viram uma **fileira sem sobreposição** logo abaixo dele:
pequenos, inteiros, lado a lado, todos clicáveis de uma vez, com o ativo
marcado por contorno.

Essa separação é deliberada. O leque é bonito quando não há nada aberto, mas
sobreposição atrapalha quando a tarefa é escolher: cartão coberto pela metade é
alvo pequeno, e com quatro ou mais o de trás fica inalcançável sem rolar a tela.
Fechado, a tela é vitrine e o leque cabe; aberto, a tela é ferramenta e a fileira
serve melhor. Trocar de cartão continua sendo um clique, sem rolagem.

Quando os cartões não couberem na largura, a fileira rola na horizontal, com o
cartão ativo sempre trazido para a área visível.

Detalhes de implementação:

- A transição usa `layoutId` por cartão no `motion`, então é o mesmo elemento que
  viaja entre leque, grade e destaque, não um fade entre elementos diferentes.
  É o que dá a sensação da referência, e é justamente o que o protótipo em CSS
  não conseguiu reproduzir.
- Mola com `stiffness 160`, `damping 18`, `mass 1`, que dá o peso de objeto
  físico em vez de deslizamento de software.
- Respeita movimento reduzido pelo hook `use-reduced-motion.ts` que já existe:
  nesse caso a troca é imediata, sem mola.
- Teclado: Tab percorre os cartões, Enter abre, Esc volta ao estado anterior.
  Clique fora também volta, por um `use-outside-click.ts` novo.
- `+ Adicionar` sai da listagem e vira ação do cabeçalho do painel.

No celular é a mesma coisa, sem layout alternativo: o leque encolhe e o detalhe
continua abaixo.

**Custo de dependência: zero.** O `motion` ^12.42.2 já está no projeto, que é
exatamente o pacote que a referência usa (`motion/react`). Setas vêm do
`lucide-react` já instalado, não de uma biblioteca de ícones nova. O único
arquivo de infraestrutura novo é o hook de clique fora.

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
   **A categoria é editável na própria linha:** clicar no chip abre o
   `SelectMenu` de categorias que já existe, e a escolha salva na hora pela
   Server Action de transação, sem abrir modal. É a correção que mais se faz numa
   fatura, e obrigar a abrir o modal inteiro só para trocar a categoria é atrito
   diário. A linha mostra estado de salvando e desfaz visualmente se a ação
   falhar.
5. **Parcelamentos em aberto**, com "parcela 3 de 10", valor da parcela e quanto
   falta no total. O dado vem da estrutura de parcelamento que já existe.
   **O título é editável ali mesmo:** clicar no nome vira um campo de texto que
   salva ao confirmar. Descrição importada de extrato costuma vir truncada ou com
   código do adquirente, e renomear "PARC 03/10 MERCPAGO*LOJA" para "Monitor 27"
   é o que torna a lista legível. A edição altera o título de todas as parcelas
   do mesmo parcelamento, não só a da fatura aberta, porque são a mesma compra.
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

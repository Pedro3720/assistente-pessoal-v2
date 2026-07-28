# Spec: calendário, card de contas e revisão do extrato (Onda 14)

> Brainstorming em 2026-07-28. Três melhorias pedidas pelo dono, com referências visuais
> (calendário nativo do Android e app Pierre). Sem migração de banco em nenhuma delas.

## Contexto

- Calendário: a grade usa `grid-cols-7 gap-1` com células `min-h-[90px]` que já mostram até 2
  eventos escritos dentro. O dono acha "espremido" e difícil de ler os dias.
- Finanças: o topo tem 4 cartões de indicador (Saldo do mês, Entradas, Despesas, Faturas
  abertas) e, mais abaixo, o card "Contas" (`BankManager`) com a grade de bancos.
- Importar extrato: a etapa de revisão usa `<select>` nativos para Conta, Tipo e Categoria, e
  não permite criar nem editar categoria sem sair do fluxo.

## 1. Calendário que respira

**Decisão do dono:** manter os eventos dentro das células (não migrar para grade limpa + lista).
**Decisão de design aprovada:** o comportamento difere por tamanho de tela, porque em 375px sete
colunas com texto de evento são ilegíveis por limite físico de espaço.

- **Cabeçalho:** mês em tipo grande (`font-display`), ano acima em texto pequeno; a navegação
  por setas e o atalho "Mês atual" permanecem.
- **Grade:** remover o `gap-1` e usar divisórias entre as semanas (o vão atual é o que dá a
  sensação de picotado); aumentar a altura da célula; número do dia maior, alinhado ao topo;
  dias de outro mês e de fim de semana mais apagados; dia de hoje com círculo sólido.
- **Celular (abaixo de `md`):** cada dia mostra o número grande e até 3 pontinhos coloridos
  (cor do evento). Tocar no dia abre a lista de eventos daquele dia, reusando o `dayPopup` que
  já existe.
- **Desktop (`md` para cima):** os eventos seguem escritos dentro da célula, com mais respiro.
- **Agenda lateral:** sem mudanças (filtros, busca e lista continuam como estão).

Arquivo: `src/components/calendar/calendar-view.tsx`.

## 2. Finanças: card de contas no estilo Pierre

**Sai:** o bloco dos 4 cartões de indicador no topo de `/financas`.
**Entra:** um card único no topo, colapsado por padrão.

- **Colapsado:** ícone do banco com **maior saldo** em destaque, rótulo "Saldo em contas", a
  **soma dos saldos de todas as contas** (via `AnimatedNumber`) e "N contas conectadas".
- **Expandido** (animação com `AnimatePresence`, respeitando `prefers-reduced-motion`):
  - lista das contas com ícone, nome e saldo (cores `--positive`/`--negative`);
  - criar e excluir conta, migrados do `BankManager`;
  - faixa com Entradas, Despesas e Faturas abertas do mês, que é o destino dos números
    removidos do topo (nenhuma informação se perde).
- **Estado vazio:** sem contas cadastradas, o card mostra convite para adicionar a primeira.

Componente novo: `src/components/finance/accounts-summary.tsx` (client), recebendo
`banks: BankWithBalance[]`, `income`, `expense` e `invoicesTotal` já calculados no servidor.
O `bank-manager.tsx` deixa de ser renderizado como card próprio; sua lógica de criar/excluir
passa para o novo componente e o arquivo é removido. Como o `BankManager` dividia uma grade de
2 colunas com o `CardManager`, essa grade passa a ter o `CardManager` em largura total.

Arquivos: `src/app/(app)/financas/page.tsx`, novo `accounts-summary.tsx`, remoção de
`bank-manager.tsx`.

## 3. Importar extrato: revisão mais moderna

- **Seletor próprio** (`src/components/ui/select-menu.tsx`): botão que abre painel via
  `createPortal` (mesma regra de modal do projeto), opções com ícone e cor, busca quando a lista
  passa de 8 itens, fecha com Esc e com clique fora. Substitui os `<select>` nativos de Conta,
  Tipo e Categoria na etapa de revisão.
- **Seletor de categoria** (`src/components/finance/category-select.tsx`): usa o seletor acima e
  acrescenta:
  - rodapé "Nova categoria" (nome e ícone), que chama `createCategory` e já deixa a categoria
    nova selecionada na linha;
  - lápis em cada item para renomear ou trocar o ícone, via `updateCategory`.
  As duas actions já existem em `src/lib/actions/finance.ts`; não é preciso criar nada no banco.
  **Categoria não tem cor:** verificado no schema (`categoryInput = { name, icon, kind }`) e no
  tipo `Category`. A identidade visual da categoria é o emoji. Incluir um seletor de cor exigiria
  migração de banco, o que está fora do escopo desta onda.
- **Tabela da revisão:** linhas mais altas, valores com a fonte numérica (`.num`), Tipo vira
  chip Despesa/Receita nas cores semânticas (`--positive`/`--negative`) no lugar de um select.

Arquivos: `src/components/finance/import-modal.tsx`, novos `select-menu.tsx` e
`category-select.tsx`.

## Erros e casos de borda

- Nome de categoria vazio: botão de salvar desabilitado.
- Falha em qualquer action: toast de erro pelo sonner já existente (padrão do projeto).
- Categoria criada durante a importação: `router.refresh()` para a lista chegar atualizada, sem
  perder as escolhas já feitas nas outras linhas.
- Conta excluída com transações: comportamento atual mantido (transações ficam sem conta).
- Dia sem evento no celular: tocar continua abrindo a criação de evento.

## Validação

Não há framework de testes no projeto. Cada fase é validada por:

- `npm run build` (inclui TypeScript);
- verificação no navegador com medição, incluindo largura a 320px e 375px para garantir que
  nada volte a estourar a tela (regressão da correção #32);
- `prefers-reduced-motion` respeitado nas animações novas;
- varredura de travessão em texto visível.

## Fora de escopo

- Não mexer em Assinaturas, Planejamento, Cartões nem no donut de categorias.
- Nenhuma migração de banco.
- Não alterar o fluxo de leitura do extrato (parser OFX/CSV) nem a etapa de upload.

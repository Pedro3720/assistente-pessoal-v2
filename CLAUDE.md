# Instruções do projeto — Zênite Assistente Pessoal (v2)

> Leia o `HANDOFF.md` inteiro antes de agir (estado do projeto, o que falta, como continuar).
> Contexto histórico detalhado em `CONTEXT.md`.

## Navegar e buscar no projeto: use o /graphify (economiza tokens)

- Para **encontrar arquivos, entender a arquitetura, achar "o que chama o quê", ou responder
  "onde está X / como funciona Y"**, use o grafo do skill **`/graphify`** em vez de sair lendo ou
  grepando vários arquivos. O grafo já está construído (`graphify-out/graph.json`).
  - Consulta: `/graphify query "sua pergunta"` (ou `graphify query "..."`).
  - Caminho entre dois conceitos: `/graphify path "A" "B"`. Explicar um nó: `/graphify explain "X"`.
- **O grafo é um retrato do CÓDIGO** (extração AST), tirado num momento. Depois de mudanças
  ele pode ficar defasado: rode `/graphify . --update` antes de navegar se mexeu bastante. Ainda
  **não cobre os docs** (só código).
- **Antes de EDITAR** um arquivo, **leia o arquivo real**. O grafo serve para descobrir e navegar,
  não substitui ler o código exato que você vai alterar.

## Antes de modificar o projeto: use /superpowers:using-superpowers

- **Sempre que o dono der um comando que vai alterar o projeto** (nova feature, correção,
  refatoração, mudança de UI ou de config), **invoque o skill `superpowers:using-superpowers`
  antes de agir**. Ele roteia para o skill certo (brainstorming para construir algo novo,
  systematic-debugging para bug, etc.); só depois comece a mexer.
- Vale mesmo para pedidos que parecem simples. Perguntas puras, sem modificação, não precisam.

## Mudanças de front end e de design: use /frontend-design:frontend-design

- **Sempre que for mexer no front end do site** (qualquer alteração visual: layout, cores,
  tipografia, espaçamento, novos componentes de UI, responsividade, dark mode, animação),
  **invoque o skill `frontend-design:frontend-design` antes de escrever o código**. Ele guia a
  direção estética e evita que a interface caia no visual "template padrão".
- O `ui-ux-pro-max:ui-ux-pro-max` continua disponível como consulta complementar quando precisar
  de catálogo (padrões de componente, tipos de gráfico, checklists de UX). A direção visual quem
  manda é o `frontend-design`.
- Ordem dos skills: `using-superpowers` roteia o fluxo primeiro (processo); depois o
  `frontend-design` conduz a implementação visual. Process skills antes, implementation skills
  depois.
- A direção visual vigente está em `docs/superpowers/specs/` (spec de design mais recente).
  Leia antes de propor mudanças de estilo, para não brigar com o sistema já definido.

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

## Manter o HANDOFF atualizado (obrigatório)

- **Sempre que finalizar uma alteração no site** (feature, correção, mudança de UI),
  **registre os pontos principais no `HANDOFF.md` antes de encerrar**, para o arquivo
  refletir sempre o estado real do projeto.
- O que registrar: o que mudou e por quê, arquivos/áreas afetadas, migrações novas (e se
  já foram rodadas), pendências que dependem do dono, e o commit/branch.
- Mantenha atualizada a data do topo do `HANDOFF.md` e a seção de "Estado atual".
- Use texto enxuto (bullet points). Novas entregas de sugestões entram como uma nova "Onda".

## Convenções técnicas

Ver `HANDOFF.md` seção 5 ("Regras de ouro") para arquitetura (Server Components leem /
Server Actions mutam, RLS `own_rows`, datas via `src/lib/dates.ts`, dinheiro via
`src/lib/money.ts`, modais via `components/ui/modal.tsx`, etc.).

- Validação de cada mudança: **`npm run build`** (não há framework de testes) + verificação
  manual no app. A CLI do Supabase é bloqueada nesta máquina: migrações são rodadas
  manualmente colando o SQL no Supabase → SQL Editor.

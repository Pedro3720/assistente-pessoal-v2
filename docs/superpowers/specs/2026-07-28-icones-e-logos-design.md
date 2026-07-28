# Spec: ícones no lugar de emojis e logos de banco (Onda 15)

> Brainstorming em 2026-07-28. Objetivo do dono: o app parar de ter "cara de IA", trocando os
> emojis por um sistema de ícones consistente, e as contas passarem a mostrar a logo do banco.
> Sem migração de banco de dados.

## Pesquisa (resumo)

- **Ícones:** o projeto já usa `lucide-react`, que é a escolha padrão em 2026 (1.500+ ícones,
  MIT, grade de 24px, tree-shaking, padrão do shadcn/ui). Alternativas avaliadas e descartadas
  para não misturar linguagens: Phosphor (9.000 ícones, 6 pesos), Tabler (5.000), Heroicons
  (292, oficial do Tailwind). **Nenhuma dependência nova é necessária.**
- **Logos de banco:** avaliados `@edusites/bancos-brasil` (MIT, 41 instituições),
  `react-br-bank-icons` e `@arcanishq/react-bank-icons` (ambos GPL-3.0, descartados por
  contaminar o licenciamento) e o repositório `Tgentil/Bancos-em-SVG` (86 logos, sem licença
  aberta). **Escolhido o pacote MIT**, usado apenas como devDependency para gerar os arquivos.
- **Marcas:** logo de banco é marca registrada e nenhum repositório pode licenciá-la. O uso aqui
  é nominativo (identificar a conta do próprio usuário), o mesmo que fazem Mobills, Organizze e
  o app de referência do dono. **Decisão do dono:** seguir com as logos no repositório, com
  aviso no README de que as marcas pertencem aos respectivos bancos.

## Decisões do dono

1. **Escopo: tudo.** Categorias, contas, assinaturas e também os emojis fixos no código.
2. **Logos: galeria.** Ao cadastrar/editar conta aparece uma grade de bancos; quem não estiver
   na lista usa ícone genérico.
3. **Marcas: seguir normalmente**, com aviso no README.

## Arquitetura: sem migração

A coluna `icon` (contas, categorias, assinaturas) é `text` e hoje guarda um emoji. Ela passa a
aceitar três formatos, decididos na renderização:

| Valor salvo | Renderiza |
|---|---|
| `home`, `car`, `utensils`… | ícone do lucide correspondente |
| `bank:nubank` | logo do banco (arquivo em `public/banks/nubank.svg`) |
| `🏠` (legado) | o próprio emoji, como hoje |

Nada precisa ser convertido no banco: o que já existe continua funcionando e o que for salvo
daqui em diante usa os formatos novos.

## Peças

- **`scripts/gen-banks.mjs`** (FEITO): gera `public/banks/<slug>.svg` (símbolo sobre o fundo da
  marca) e `src/lib/finance/banks.ts` (lista enxuta: slug, nome, cor). 28 instituições, 96 KB em
  arquivos estáticos e 2 KB no bundle. Os SVGs ficam em `public/` de propósito: o navegador
  baixa só a logo em uso e a cacheia, em vez de carregar todos os vetores em toda página.
  *Verificado no navegador: as 28 logos carregam e renderizam fundo e símbolo.*
- **`src/lib/icons/catalog.ts`** (novo): catálogo de ícones lucide disponíveis para escolha,
  agrupados por tema (casa, comida, transporte, saúde, lazer, trabalho, dinheiro, outros), com
  o nome usado como valor salvo.
- **`src/components/ui/entity-icon.tsx`** (novo): recebe o valor da coluna `icon` e renderiza a
  logo, o ícone lucide ou o emoji legado, no tamanho pedido.
- **`src/components/ui/icon-picker.tsx`** (novo): seletor visual. Duas abas: **Bancos** (grade de
  logos, só para contas) e **Ícones** (grade lucide por tema, com busca).
- **Substituições**: `defaults.ts` (12 categorias padrão passam a nascer com nome de ícone),
  `accounts-summary`, `category-manager`, `category-select`, `subscriptions-section`,
  `import-modal`, `statement`, `planning-section`, `transactions-section`,
  `(app)/financas/page.tsx` e o `🎉` do dashboard.
- **`README.md`**: seção curta creditando a origem das logos e registrando que as marcas
  pertencem aos bancos.

## Casos de borda

- Conta/categoria antiga com emoji: continua exibindo o emoji (sem migração forçada).
- Banco removido do catálogo no futuro: `EntityIcon` cai no ícone genérico de banco.
- Logo que não carregar (arquivo faltando): o `img` cai para o ícone genérico via `onError`.
- Campo `icon` vazio: ícone genérico conforme o contexto (banco, tag ou repetição).

## Validação

- `npm run build` a cada fase.
- Navegador: as 28 logos renderizando (feito), o seletor abrindo e gravando o valor certo, e
  medição de largura a 320 e 375px.
- Varredura final: `rg` por emoji em `src` não deve retornar nada em texto visível.

## Fora de escopo

- Não trocar a biblioteca de ícones (lucide fica).
- Não mexer em cores de cartão, calendário ou tarefas.
- Nenhuma migração de banco.

# Spec — Categorias de Tarefas (#29)

**Data:** 2026-07-23
**Origem:** sugestão #29 da aba /sugestoes.
**Pedido do usuário:** poder criar/editar/excluir categorias para as tarefas, deixar tarefa
sem categoria, e filtrar as tarefas por categoria (além dos filtros atuais). Ex.: "Pessoal", "Trabalho".

## Decisões (aprovadas)
- Filtro por categoria = **2ª fileira de chips** abaixo dos chips de status (combinam: status E categoria).
- O chip da categoria **também aparece** na lista "Tarefas Pendentes" do Dashboard.
- Categorias têm **cor** (chip colorido). Sem ícone/emoji (diferente das categorias de Finanças).
- Categorias de tarefas são **separadas** das de Finanças (domínios diferentes).

## Banco (migração 0014, rodada manual no SQL Editor)
- Nova tabela `task_categories`: `id`, `user_id` (FK auth.users, on delete cascade), `name`,
  `color` (default `#3b82f6`), `created_at`. RLS `own_rows` (padrão do projeto).
- `tasks`: nova coluna `category_id bigint references task_categories(id) on delete set null`
  (nulo = "Sem categoria"; excluir a categoria não apaga a tarefa, só desvincula).

## Camadas
- **types:** `Task.category_id: number|null`; nova interface `TaskCategory {id,name,color}`.
- **validation:** `taskInput` ganha `category_id` (nullable, default null); novo `taskCategoryInput {name,color}`.
- **data:** `getTaskCategories()` com **fallback vazio se a tabela não existir** (padrão assinaturas/
  planejamento), para a página não quebrar antes da migração. `getTasks` já usa `select("*")`.
- **actions:** `create/update/deleteTaskCategory`; `createTask/updateTask` já incluem `category_id`.
- **constants:** paleta `TASK_CATEGORY_COLORS`.

## UI
- **task-category-manager.tsx:** modal (usa `components/ui/modal.tsx`) para CRUD (nome + cor).
  Espelha o `finance/category-manager`. Excluir avisa que as tarefas ficam sem categoria.
- **task-modal.tsx:** select "Categoria" (com "Sem categoria"). Recebe `categories`.
- **tasks-view.tsx:** botão "Categorias" (abre o manager); 2ª fileira de chips de categoria
  ("Todas" + cada categoria); filtro combinado status+categoria; chip colorido em cada tarefa;
  reordenar (drag) desabilitado quando há filtro de categoria ativo (igual já é com status).
- **tarefas/page.tsx:** busca categorias e passa para a TasksView.
- **dashboard (data + page):** anexa a categoria às topTasks e mostra o chip.

## Validação
- `npm run build`. Verificação visual do CRUD/filtro/chip via rota temporária com dados fictícios
  (a página real fica atrás de login). Migração 0014 é pré-requisito para o runtime.

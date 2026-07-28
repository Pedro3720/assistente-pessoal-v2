import type { CategoryKind } from "@/types/finance";

/**
 * Categorias padrão criadas para um usuário novo (via ensureDefaultCategories).
 * O `icon` é o nome de um ícone do catálogo (`src/lib/icons/catalog.ts`).
 */
export const DEFAULT_CATEGORIES: { name: string; icon: string; kind: CategoryKind }[] = [
  // Despesas
  { name: "Moradia", icon: "home", kind: "expense" },
  { name: "Alimentação", icon: "utensils", kind: "expense" },
  { name: "Transporte", icon: "car", kind: "expense" },
  { name: "Lazer", icon: "gamepad-2", kind: "expense" },
  { name: "Saúde", icon: "heart-pulse", kind: "expense" },
  { name: "Educação", icon: "graduation-cap", kind: "expense" },
  { name: "Assinaturas", icon: "repeat", kind: "expense" },
  { name: "Outros", icon: "tag", kind: "expense" },
  // Receitas
  { name: "Salário", icon: "briefcase", kind: "income" },
  { name: "Freelance", icon: "laptop", kind: "income" },
  { name: "Investimentos", icon: "trending-up", kind: "income" },
  { name: "Outras Receitas", icon: "banknote", kind: "income" },
];

export const CARD_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#10b981",
  "#f59e0b", "#ef4444", "#14b8a6", "#f97316",
];

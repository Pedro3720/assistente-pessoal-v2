import type { CategoryKind } from "@/types/finance";

/** Categorias padrão criadas para um usuário novo (via ensureDefaultCategories). */
export const DEFAULT_CATEGORIES: { name: string; icon: string; kind: CategoryKind }[] = [
  // Despesas
  { name: "Moradia", icon: "🏠", kind: "expense" },
  { name: "Alimentação", icon: "🍽️", kind: "expense" },
  { name: "Transporte", icon: "🚗", kind: "expense" },
  { name: "Lazer", icon: "🎮", kind: "expense" },
  { name: "Saúde", icon: "🏥", kind: "expense" },
  { name: "Educação", icon: "📚", kind: "expense" },
  { name: "Assinaturas", icon: "📱", kind: "expense" },
  { name: "Outros", icon: "📌", kind: "expense" },
  // Receitas
  { name: "Salário", icon: "💼", kind: "income" },
  { name: "Freelance", icon: "💻", kind: "income" },
  { name: "Investimentos", icon: "📈", kind: "income" },
  { name: "Outras Receitas", icon: "💰", kind: "income" },
];

export const CARD_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#10b981",
  "#f59e0b", "#ef4444", "#14b8a6", "#f97316",
];

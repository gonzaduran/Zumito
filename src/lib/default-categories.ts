import type { CategoryColor } from "@/lib/category-colors"

/**
 * Categorías que se sugieren en el onboarding, una por color de la paleta.
 * Los nombres se toman del diccionario (onboarding.categories.<key>).
 */
export const defaultCategories = [
  { key: "food", emoji: "🍽️", color: "amber" },
  { key: "groceries", emoji: "🛒", color: "teal" },
  { key: "coffee", emoji: "☕", color: "plum" },
  { key: "leisure", emoji: "🍻", color: "rose" },
  { key: "transport", emoji: "🚌", color: "ocean" },
  { key: "home", emoji: "🏠", color: "denim" },
  { key: "health", emoji: "💊", color: "sage" },
  { key: "clothes", emoji: "👕", color: "orchid" },
  { key: "gifts", emoji: "🎁", color: "brick" },
  { key: "travel", emoji: "✈️", color: "terracotta" },
  { key: "subscriptions", emoji: "📱", color: "olive" },
  { key: "pets", emoji: "🐶", color: "moss" },
] as const satisfies readonly { key: string; emoji: string; color: CategoryColor }[]

export type DefaultCategoryKey = (typeof defaultCategories)[number]["key"]

export const defaultCategoryKeys = defaultCategories.map((c) => c.key) as [
  DefaultCategoryKey,
  ...DefaultCategoryKey[],
]

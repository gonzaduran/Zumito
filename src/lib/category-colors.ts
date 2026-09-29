/**
 * Paleta de categorías, en el orden en que se muestra al elegir color.
 * Los valores de cada color (claro y oscuro) están en src/app/globals.css (--cat-*).
 */
export const categoryColors = [
  "rose",
  "brick",
  "terracotta",
  "amber",
  "olive",
  "moss",
  "sage",
  "teal",
  "ocean",
  "denim",
  "plum",
  "orchid",
] as const

export type CategoryColor = (typeof categoryColors)[number]

/** Color neutro para el grupo "Otros" en los gráficos. */
export type ChartColor = CategoryColor | "other"

export function categoryColorVar(color: ChartColor): string {
  return `var(--cat-${color})`
}

export function isCategoryColor(value: string): value is CategoryColor {
  return (categoryColors as readonly string[]).includes(value)
}

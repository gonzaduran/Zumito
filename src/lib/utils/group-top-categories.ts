/** Número de categorías que se muestran por separado en los gráficos. */
export const CHART_TOP_CATEGORIES = 6

/**
 * Ordena por importe y deja las `top` categorías mayores; el resto se agrupa en un
 * único elemento creado por `toOther` (normalmente "Otros", en color neutro).
 */
export function groupTopCategories<T extends { amount: number }>(
  items: readonly T[],
  toOther: (rest: T[]) => T,
  top: number = CHART_TOP_CATEGORIES,
): T[] {
  const sorted = [...items].sort((a, b) => b.amount - a.amount)
  if (sorted.length <= top) return sorted
  return [...sorted.slice(0, top), toOther(sorted.slice(top))]
}

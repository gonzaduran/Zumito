import { formatCents, formatPercent } from "@/i18n/format"
import { interpolate } from "@/i18n/interpolate"
import { isCategoryColor, type ChartColor } from "@/lib/category-colors"
import { groupTopCategories } from "@/lib/utils/group-top-categories"
import type { Database } from "@/types/database"

/** Fila del reparto por categoría, lista para mostrar. */
export type CategorySpending = {
  id: string
  emoji: string
  name: string
  /** Importe ya formateado. */
  amount: string
  /** Proporción de la barra (0-1). */
  share: number
  /** Porcentaje ya formateado, p. ej. "30 %". */
  percent?: string
  color: ChartColor
}

type CategoryRow = Database["public"]["Functions"]["spending_by_category"]["Returns"][number]

/** `amount` en céntimos. */
type Slice = {
  id: string
  emoji: string
  name: string
  amount: number
  color: CategorySpending["color"]
}

const OTHERS_EMOJI = "📦"

/**
 * Reparto por categoría para listas y gráficos: las `top` mayores y, si hay más,
 * el resto agrupado en "Otros" (color neutro). El % es sobre el total del periodo.
 */
export function buildCategoryBreakdown(
  rows: CategoryRow[],
  {
    top,
    othersLabel,
    includeOthers = true,
  }: { top: number; othersLabel: string; includeOthers?: boolean },
): CategorySpending[] {
  const total = rows.reduce((sum, row) => sum + row.total_cents, 0)
  if (total <= 0) return []

  const slices: Slice[] = rows.map((row) => ({
    id: row.category_id,
    emoji: row.emoji,
    name: row.name,
    amount: row.total_cents,
    color: isCategoryColor(row.color) ? row.color : "other",
  }))

  const grouped = includeOthers
    ? groupTopCategories(
        slices,
        (rest) => {
          const amount = rest.reduce((sum, s) => sum + s.amount, 0)
          return {
            id: "others",
            emoji: OTHERS_EMOJI,
            name: othersLabel,
            amount,
            color: "other" as const,
          }
        },
        top,
      )
    : slices.slice(0, top)

  return grouped.map((slice) => {
    const share = slice.amount / total
    return {
      id: slice.id,
      emoji: slice.emoji,
      name: slice.name,
      amount: formatCents(slice.amount),
      share,
      percent: formatPercent(Math.round(share * 100)),
      color: slice.color,
    }
  })
}

export type Delta = { direction: "up" | "down" | "same"; label: string }

/** "↑ 12 % más que en agosto". `null` si no hay periodo anterior con gastos. */
export function describeDelta(
  change: number | null,
  labels: { more: string; less: string; same: string },
  period: string,
): Delta | null {
  if (change === null) return null
  if (change === 0) return { direction: "same", label: interpolate(labels.same, { period }) }
  const percent = formatPercent(Math.abs(change))
  return change > 0
    ? { direction: "up", label: interpolate(labels.more, { percent, period }) }
    : { direction: "down", label: interpolate(labels.less, { percent, period }) }
}

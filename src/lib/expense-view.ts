import { formatCents, formatDayLabel, formatMoment, formatTime } from "@/i18n/format"
import type { Database } from "@/types/database"

export type ExpenseRow = Database["public"]["Functions"]["search_expenses"]["Returns"][number]

/** Gasto listo para mostrar y editar (serializable para pasarlo a componentes cliente). */
export type ListedExpense = {
  id: string
  amountCents: number
  categoryId: string
  categoryName: string
  categoryColor: string
  description: string | null
  note: string | null
  spentAt: string
  emoji: string
  title: string
  subtitle: string
  amount: string
}

export type ExpenseGroup = { key: string; label?: string; total?: string; items: ListedExpense[] }

type ViewOptions = {
  labels: { today: string; yesterday: string }
  timeZone?: string
  now?: Date
}

function toListed(row: ExpenseRow, subtitle: (row: ExpenseRow) => string): ListedExpense {
  return {
    id: row.id,
    amountCents: row.amount_cents,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryColor: row.category_color,
    description: row.description,
    note: row.note,
    spentAt: row.spent_at,
    emoji: row.category_emoji,
    // Sin concepto, el título es la categoría.
    title: row.description ?? row.category_name,
    subtitle: subtitle(row),
    amount: formatCents(row.amount_cents),
  }
}

/** Lista plana (Inicio): "Hoy · 14:32". */
export function toRecentExpenses(rows: ExpenseRow[], { labels, timeZone, now }: ViewOptions) {
  return rows.map((row) =>
    toListed(row, (r) => formatMoment(new Date(r.spent_at), labels, { timeZone, now })),
  )
}

/** Historial agrupado por día local, con el total de cada día. */
export function groupExpensesByDay(
  rows: ExpenseRow[],
  { labels, timeZone, now }: ViewOptions,
): ExpenseGroup[] {
  const groups: ExpenseGroup[] = []
  for (const row of rows) {
    let group = groups.at(-1)
    if (group?.key !== row.day) {
      group = {
        key: row.day,
        label: formatDayLabel(row.day, labels, { timeZone, now }),
        total: formatCents(row.day_total_cents),
        items: [],
      }
      groups.push(group)
    }
    group.items.push(
      toListed(row, (r) => {
        const time = formatTime(new Date(r.spent_at), { timeZone })
        return r.description ? `${r.category_name} · ${time}` : time
      }),
    )
  }
  return groups
}

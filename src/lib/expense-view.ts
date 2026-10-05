import { formatCents, formatDayLabel, formatMoment, formatTime } from "@/i18n/format"
import type { Mood } from "@/lib/validators/expense"
import { moods } from "@/lib/validators/expense"
import type { Database } from "@/types/database"

export type ExpenseRow = Database["public"]["Functions"]["search_expenses"]["Returns"][number]

export type PersonRef = { id: string; name: string }

/** Gasto listo para mostrar y editar (serializable para pasarlo a componentes cliente). */
export type ListedExpense = {
  id: string
  amountCents: number
  categoryId: string
  accountId: string
  categoryName: string
  categoryColor: string
  description: string | null
  note: string | null
  spentAt: string
  placeName: string | null
  mood: Mood | null
  people: PersonRef[]
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

const isMood = (value: string | null): value is Mood =>
  value !== null && (moods as readonly string[]).includes(value)

/** La columna jsonb "people" de search_expenses: [{ id, name }]. */
function parsePeople(value: unknown): PersonRef[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) =>
    item && typeof item === "object" && "id" in item && "name" in item
      ? [{ id: String(item.id), name: String(item.name) }]
      : [],
  )
}

/**
 * Título: el concepto, o el lugar, o la categoría. El subtítulo añade lo que no esté
 * ya en el título (categoría y lugar) y el momento.
 */
function toListed(row: ExpenseRow, moment: string): ListedExpense {
  const title = row.description ?? row.place_name ?? row.category_name
  const details = [
    title !== row.category_name ? row.category_name : null,
    row.place_name && title !== row.place_name ? row.place_name : null,
    moment,
  ].filter(Boolean)

  return {
    id: row.id,
    amountCents: row.amount_cents,
    categoryId: row.category_id,
    accountId: row.account_id,
    categoryName: row.category_name,
    categoryColor: row.category_color,
    description: row.description,
    note: row.note,
    spentAt: row.spent_at,
    placeName: row.place_name,
    mood: isMood(row.mood) ? row.mood : null,
    people: parsePeople(row.people),
    emoji: row.category_emoji,
    title,
    subtitle: details.join(" · "),
    amount: formatCents(row.amount_cents),
  }
}

/** Lista plana (Inicio): "Hoy · 14:32". */
export function toRecentExpenses(rows: ExpenseRow[], { labels, timeZone, now }: ViewOptions) {
  return rows.map((row) =>
    toListed(row, formatMoment(new Date(row.spent_at), labels, { timeZone, now })),
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
    group.items.push(toListed(row, formatTime(new Date(row.spent_at), { timeZone })))
  }
  return groups
}

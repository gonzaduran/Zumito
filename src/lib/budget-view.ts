import { formatCents, formatPercent } from "@/i18n/format"
import { interpolate } from "@/i18n/interpolate"
import type { Database } from "@/types/database"

export type BudgetStatusRow = Database["public"]["Functions"]["budget_status"]["Returns"][number]

export type BudgetNoticeView = { tone: "ok" | "warning" | "over"; message: string }

export type BudgetNoticeLabels = {
  over: string
  overTotal: string
  warning: string
  warningTotal: string
  ok: string
  okTotal: string
}

/** A partir de este uso se avisa ("Vas por el 80 %…"). */
export const BUDGET_WARNING_RATIO = 0.8

const ratioOf = (row: BudgetStatusRow) => row.spent_cents / row.amount_cents
/** Porcentaje redondeado hacia abajo: con un 79,6 % no se dice "80 %". */
const percentOf = (row: BudgetStatusRow) => formatPercent(Math.floor(ratioOf(row) * 100))

/**
 * El aviso más relevante del mes: primero lo que se ha pasado (lo más pasado antes),
 * luego lo que está cerca del límite y, si todo va bien, un mensaje tranquilo.
 */
export function pickBudgetNotice(
  rows: BudgetStatusRow[],
  labels: BudgetNoticeLabels,
): BudgetNoticeView | null {
  const valid = rows.filter((row) => row.amount_cents > 0)
  if (valid.length === 0) return null
  const byRatio = [...valid].sort((a, b) => ratioOf(b) - ratioOf(a))
  const worst = byRatio[0]
  if (!worst) return null

  const isTotal = worst.category_id === null
  const name = worst.name ?? ""
  if (ratioOf(worst) > 1) {
    return {
      tone: "over",
      message: isTotal ? labels.overTotal : interpolate(labels.over, { name }),
    }
  }
  if (ratioOf(worst) >= BUDGET_WARNING_RATIO) {
    const percent = percentOf(worst)
    return {
      tone: "warning",
      message: isTotal
        ? interpolate(labels.warningTotal, { percent })
        : interpolate(labels.warning, { percent, name }),
    }
  }
  const total = valid.find((row) => row.category_id === null)
  return {
    tone: "ok",
    message: total
      ? interpolate(labels.okTotal, {
          spent: formatCents(total.spent_cents),
          budget: formatCents(total.amount_cents),
        })
      : labels.ok,
  }
}

/** Anillo de la tarjeta del Inicio: uso del presupuesto total del mes, si existe. */
export function totalBudgetRing(rows: BudgetStatusRow[], ariaTemplate: string) {
  const total = rows.find((row) => row.category_id === null && row.amount_cents > 0)
  if (!total) return undefined
  const percent = percentOf(total)
  return {
    value: ratioOf(total),
    label: percent,
    ariaLabel: interpolate(ariaTemplate, { percent }),
  }
}

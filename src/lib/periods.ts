/**
 * Cálculos de periodos con días de calendario ("aaaa-mm-dd") y meses ("aaaa-mm").
 * Todo en UTC puro: los días ya vienen resueltos en la zona horaria del usuario.
 */

export type DateRange = { from: string; to: string }

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

const toDay = (date: Date) => date.toISOString().slice(0, 10)
const parseMonth = (month: string) => {
  const [year, monthIndex] = month.split("-").map(Number)
  return { year: year ?? 1970, index: (monthIndex ?? 1) - 1 }
}

export function addMonths(month: string, amount: number): string {
  const { year, index } = parseMonth(month)
  return toDay(new Date(Date.UTC(year, index + amount, 1))).slice(0, 7)
}

/** Mes del parámetro de la URL si es válido y no futuro; si no, el actual. */
export function resolveMonth(param: string | undefined, currentMonth: string): string {
  return param && MONTH_PATTERN.test(param) && param <= currentMonth ? param : currentMonth
}

/** Del día 1 del mes (incluido) al día 1 del siguiente (excluido). */
export function monthRange(month: string): DateRange {
  return { from: `${month}-01`, to: `${addMonths(month, 1)}-01` }
}

/**
 * Periodo con el que comparar un mes. Si es el mes en curso, los mismos días del mes
 * anterior (del 1 al día de hoy), para que la comparación sea justa; si ya terminó,
 * el mes anterior completo.
 */
export function comparisonRange(month: string, today: string): DateRange {
  const previous = monthRange(addMonths(month, -1))
  if (today.slice(0, 7) !== month) return previous
  const { year, index } = parseMonth(previous.from.slice(0, 7))
  const dayOfMonth = Number(today.slice(8, 10))
  const end = toDay(new Date(Date.UTC(year, index, dayOfMonth + 1)))
  return { from: previous.from, to: end < previous.to ? end : previous.to }
}

/** Variación en % respecto al periodo anterior. `null` si no hay con qué comparar. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

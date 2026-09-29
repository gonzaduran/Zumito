import { defaultCurrency, defaultLocale, defaultTimeZone, type Locale } from "./config"

type FormatOptions = { locale?: Locale; timeZone?: string }

export function formatCurrency(
  amount: number,
  locale: Locale = defaultLocale,
  currency: string = defaultCurrency,
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount)
}

/** Importe guardado en céntimos → "12,50 €". */
export function formatCents(cents: number, locale: Locale = defaultLocale): string {
  return formatCurrency(cents / 100, locale)
}

/** Nombre del mes con mayúscula inicial, p. ej. "Septiembre". */
export function formatMonth(
  date: Date,
  { locale = defaultLocale, timeZone = defaultTimeZone }: FormatOptions = {},
): string {
  const month = new Intl.DateTimeFormat(locale, { month: "long", timeZone }).format(date)
  return month.charAt(0).toUpperCase() + month.slice(1)
}

/** dd/mm/aaaa */
export function formatDate(
  date: Date,
  { locale = defaultLocale, timeZone = defaultTimeZone }: FormatOptions = {},
): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone,
  }).format(date)
}

/** Día de calendario en la zona horaria dada, como "aaaa-mm-dd". */
export function calendarDay(date: Date, timeZone: string = defaultTimeZone): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(date)
}

/** Día anterior a un "aaaa-mm-dd" (por calendario, sin problemas con el cambio de hora). */
function previousDay(day: string): string {
  const [year, month, dayOfMonth] = day.split("-").map(Number)
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (dayOfMonth ?? 1) - 1))
    .toISOString()
    .slice(0, 10)
}

/** "Hoy · 14:32", "Ayer · 08:00" o "25/09/2026 · 19:05". */
export function formatMoment(
  date: Date,
  labels: { today: string; yesterday: string },
  {
    now = new Date(),
    locale = defaultLocale,
    timeZone = defaultTimeZone,
  }: FormatOptions & {
    now?: Date
  } = {},
): string {
  const day = calendarDay(date, timeZone)
  const today = calendarDay(now, timeZone)
  const label =
    day === today
      ? labels.today
      : day === previousDay(today)
        ? labels.yesterday
        : formatDate(date, { locale, timeZone })
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(date)
  return `${label} · ${time}`
}

/** Cabecera de un día del historial: "Hoy", "Ayer", "Lunes, 28 de septiembre" (con año si no es el actual). */
export function formatDayLabel(
  day: string,
  labels: { today: string; yesterday: string },
  {
    now = new Date(),
    locale = defaultLocale,
    timeZone = defaultTimeZone,
  }: FormatOptions & {
    now?: Date
  } = {},
): string {
  const today = calendarDay(now, timeZone)
  if (day === today) return labels.today
  if (day === previousDay(today)) return labels.yesterday
  // Mediodía UTC del día para que ninguna zona horaria lo mueva.
  const date = new Date(`${day}T12:00:00Z`)
  const text = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: day.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric",
    timeZone: "UTC",
  }).format(date)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Hora "14:32" en la zona horaria dada. */
export function formatTime(
  date: Date,
  { locale = defaultLocale, timeZone = defaultTimeZone }: FormatOptions = {},
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(date)
}

/** Porcentaje sin decimales a partir de un valor 0-100: 12 → "12 %". */
export function formatPercent(value: number, locale: Locale = defaultLocale): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(
    value / 100,
  )
}

/** "septiembre de 2026", "septiembre" (sin año) o "sept" (corto). */
export function formatMonthName(
  month: string,
  {
    locale = defaultLocale,
    style = "long",
    withYear = style === "long",
  }: { locale?: Locale; style?: "long" | "short"; withYear?: boolean } = {},
): string {
  const date = new Date(`${month}-15T12:00:00Z`)
  return new Intl.DateTimeFormat(locale, {
    month: style,
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(date)
}

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

import { format } from "date-fns"
import { es } from "date-fns/locale"

import { defaultCurrency, defaultLocale, type Locale } from "./config"

const dateFnsLocales = { "es-ES": es } satisfies Record<Locale, unknown>

export function formatCurrency(
  amount: number,
  locale: Locale = defaultLocale,
  currency: string = defaultCurrency,
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount)
}

/** Nombre del mes con mayúscula inicial, p. ej. "Septiembre". */
export function formatMonth(date: Date, locale: Locale = defaultLocale): string {
  const month = format(date, "LLLL", { locale: dateFnsLocales[locale] })
  return month.charAt(0).toUpperCase() + month.slice(1)
}

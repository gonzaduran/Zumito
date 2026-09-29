import { defaultCurrency, defaultLocale, type Locale } from "./config"

export function formatCurrency(
  amount: number,
  locale: Locale = defaultLocale,
  currency: string = defaultCurrency,
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount)
}

/** dd/mm/aaaa */
export function formatDate(date: Date, locale: Locale = defaultLocale): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

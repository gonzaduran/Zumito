export const locales = ["es-ES"] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "es-ES"
export const defaultCurrency = "EUR"
export const defaultTimeZone = "Europe/Madrid"

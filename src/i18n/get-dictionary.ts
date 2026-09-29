import "server-only"

import { defaultLocale, type Locale } from "./config"
import type esES from "./dictionaries/es-ES.json"

/** Todas las traducciones deben tener la misma forma que el diccionario base (es-ES). */
export type Dictionary = typeof esES

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  "es-ES": () => import("./dictionaries/es-ES.json").then((module) => module.default),
}

export function getDictionary(locale: Locale = defaultLocale): Promise<Dictionary> {
  return dictionaries[locale]()
}

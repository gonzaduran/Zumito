import type { Dictionary } from "@/i18n/get-dictionary"

export type ValidationMessage = keyof Dictionary["validation"]

/**
 * Los errores de validación devuelven una clave del diccionario (`validation.*`),
 * no un texto: el formulario la traduce al mostrarla.
 */
export const msg = (key: ValidationMessage) => key

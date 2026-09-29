/**
 * Lógica del teclado numérico propio. El importe se guarda como el texto que
 * teclea el usuario ("12,5") y se convierte a céntimos al guardar.
 */

import { MAX_AMOUNT_CENTS } from "@/lib/validators/money"

export type AmountKey =
  "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "," | "backspace"

const DECIMAL_SEPARATOR = ","
const MAX_DECIMALS = 2

/** Aplica una tecla al texto actual. Ignora las pulsaciones que dejarían un importe no válido. */
export function applyAmountKey(current: string, key: AmountKey): string {
  if (key === "backspace") return current.slice(0, -1)

  const [integer = "", decimals] = current.split(DECIMAL_SEPARATOR)

  if (key === DECIMAL_SEPARATOR) {
    if (decimals !== undefined) return current
    return `${integer || "0"}${DECIMAL_SEPARATOR}`
  }

  let next: string
  if (decimals !== undefined) {
    if (decimals.length >= MAX_DECIMALS) return current
    next = current + key
  } else {
    // Sin ceros a la izquierda: "0" seguido de "5" es "5".
    next = integer === "0" ? key : integer + key
  }
  return toCents(next) > MAX_AMOUNT_CENTS ? current : next
}

/** "12,5" → 1250. Texto vacío → 0. */
export function toCents(value: string): number {
  const [integer = "", decimals = ""] = value.split(DECIMAL_SEPARATOR)
  return Number(integer || "0") * 100 + Number(decimals.padEnd(MAX_DECIMALS, "0") || "0")
}

/** Texto para mostrar mientras se teclea, con separador de miles: "1234,5" → "1.234,5". */
export function formatAmountInput(value: string): string {
  if (!value) return "0"
  const [integer = "0", decimals] = value.split(DECIMAL_SEPARATOR)
  const grouped = (integer || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return decimals === undefined ? grouped : `${grouped}${DECIMAL_SEPARATOR}${decimals}`
}

/** Traduce una tecla física (teclado del ordenador) a una tecla del teclado propio. */
export function keyFromKeyboard(key: string): AmountKey | null {
  if (/^\d$/.test(key)) return key as AmountKey
  if (key === "," || key === ".") return ","
  if (key === "Backspace") return "backspace"
  return null
}

/** Céntimos → texto del teclado, para editar un gasto: 1250 → "12,5", 1200 → "12". */
export function fromCents(cents: number): string {
  const integer = Math.floor(cents / 100)
  const decimals = String(cents % 100)
    .padStart(MAX_DECIMALS, "0")
    .replace(/0+$/, "")
  return decimals ? `${integer}${DECIMAL_SEPARATOR}${decimals}` : String(integer)
}

/**
 * Importe escrito en un campo de texto → céntimos. Admite "150", "12,50", "1.500",
 * "1.500,5" y "12.5". Vacío → `null` (sin importe). Texto no válido → `NaN`.
 */
export function parseEuros(text: string): number | null {
  const value = text.trim().replace(/\s|€/g, "")
  if (!value) return null
  // Con coma, los puntos son de miles. Sin coma, un punto seguido de 1-2 cifras es decimal.
  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : /^\d+\.\d{1,2}$/.test(value)
      ? value
      : value.replace(/\./g, "")
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return Number.NaN
  return Math.round(Number(normalized) * 100)
}

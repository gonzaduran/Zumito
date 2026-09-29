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

import { describe, expect, it } from "vitest"

import {
  applyAmountKey,
  formatAmountInput,
  keyFromKeyboard,
  toCents,
  type AmountKey,
} from "./amount-input"

/** Teclea una secuencia; "<" es borrar. */
const type = (keys: string) =>
  [...keys].reduce(
    (acc, key) => applyAmountKey(acc, (key === "<" ? "backspace" : key) as AmountKey),
    "",
  )

describe("teclado de importe", () => {
  it("convierte lo tecleado a céntimos", () => {
    expect(toCents(type("5"))).toBe(500)
    expect(toCents(type("12,5"))).toBe(1250)
    expect(toCents(type("12,50"))).toBe(1250)
    expect(toCents(type("0,99"))).toBe(99)
    expect(toCents("")).toBe(0)
  })

  it("empieza por 0, si se pulsa la coma primero", () => {
    expect(type(",")).toBe("0,")
  })

  it("no admite ceros a la izquierda, dos comas ni más de 2 decimales", () => {
    expect(type("007")).toBe("7")
    expect(type("1,,2")).toBe("1,2")
    expect(type("1,234")).toBe("1,23")
  })

  it("borra de uno en uno y no falla con el texto vacío", () => {
    expect(type("12,5<<")).toBe("12")
    expect(type("1<<<")).toBe("")
  })

  it("no pasa de 1.000.000 €, tampoco con decimales", () => {
    expect(type("10000000")).toBe("1000000")
    expect(toCents(type("1000000"))).toBe(100_000_000)
    expect(type("1000000,01")).toBe("1000000,0")
  })

  it("muestra separador de miles mientras se teclea", () => {
    expect(formatAmountInput("1234567,8")).toBe("1.234.567,8")
    expect(formatAmountInput("12,")).toBe("12,")
    expect(formatAmountInput("")).toBe("0")
  })

  it("entiende el teclado físico", () => {
    expect(keyFromKeyboard("7")).toBe("7")
    expect(keyFromKeyboard(".")).toBe(",")
    expect(keyFromKeyboard(",")).toBe(",")
    expect(keyFromKeyboard("Backspace")).toBe("backspace")
    expect(keyFromKeyboard("a")).toBeNull()
  })
})

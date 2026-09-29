import { describe, expect, it } from "vitest"

import {
  applyAmountKey,
  formatAmountInput,
  fromCents,
  keyFromKeyboard,
  parseEuros,
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

  it("convierte céntimos al texto del teclado para editar", () => {
    expect(fromCents(1250)).toBe("12,5")
    expect(fromCents(1205)).toBe("12,05")
    expect(fromCents(1200)).toBe("12")
    expect(fromCents(99)).toBe("0,99")
    for (const cents of [1, 10, 99, 100, 1250, 123456, 100_000_000]) {
      expect(toCents(fromCents(cents))).toBe(cents)
    }
  })

  it("interpreta importes escritos a mano", () => {
    expect(parseEuros("150")).toBe(15000)
    expect(parseEuros("12,50")).toBe(1250)
    expect(parseEuros("12,5 €")).toBe(1250)
    expect(parseEuros("1.500")).toBe(150000)
    expect(parseEuros("1.500,5")).toBe(150050)
    expect(parseEuros("12.5")).toBe(1250)
    expect(parseEuros("  ")).toBeNull()
    expect(parseEuros("doce")).toBeNaN()
    expect(parseEuros("12,555")).toBeNaN()
  })
})

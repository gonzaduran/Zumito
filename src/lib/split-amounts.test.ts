import { describe, expect, it } from "vitest"

import { remainingCents, splitEqually } from "./split-amounts"

describe("dividir un gasto", () => {
  it("a partes iguales suma siempre el total", () => {
    expect(splitEqually(500, 2)).toEqual([250, 250])
    expect(splitEqually(1000, 3)).toEqual([334, 333, 333])
    expect(splitEqually(1, 2)).toEqual([1, 0])
    expect(splitEqually(1000, 3).reduce((a, b) => a + b, 0)).toBe(1000)
  })

  it("sin personas o sin importe no hay partes", () => {
    expect(splitEqually(1000, 0)).toEqual([])
    expect(splitEqually(0, 2)).toEqual([])
  })

  it("dice cuánto falta o sobra al repartir por importes", () => {
    expect(remainingCents(1000, [700, 300])).toBe(0)
    expect(remainingCents(1000, [700])).toBe(300)
    expect(remainingCents(1000, [700, 400])).toBe(-100)
  })
})

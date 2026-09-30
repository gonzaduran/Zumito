import { describe, expect, it } from "vitest"

import { parseQuickAddParams } from "./quick-add-params"

const categories = [
  { id: "c1", name: "Cafés" },
  { id: "c2", name: "Súper" },
]

describe("parámetros de /add", () => {
  it("prellena categoría por nombre (sin mayúsculas ni tildes), importe, descripción y lugar", () => {
    expect(
      parseQuickAddParams(
        { categoria: "cafes", importe: "3,50", descripcion: " Café con leche ", lugar: "Bar" },
        categories,
      ),
    ).toEqual({
      categoryId: "c1",
      amountCents: 350,
      description: "Café con leche",
      place: "Bar",
      invalid: [],
    })
  })

  it("acepta punto decimal y miles", () => {
    expect(parseQuickAddParams({ importe: "12.5" }, categories).amountCents).toBe(1250)
    expect(parseQuickAddParams({ importe: "1.500" }, categories).amountCents).toBe(150000)
  })

  it.each([["0"], ["-5"], ["abc"], ["1000000,01"], ["2000000"]])(
    "rechaza el importe %s",
    (importe) => {
      const result = parseQuickAddParams({ importe }, categories)
      expect(result.amountCents).toBeUndefined()
      expect(result.invalid).toContain("importe")
    },
  )

  it("permite justo el tope de 1.000.000 €", () => {
    expect(parseQuickAddParams({ importe: "1000000" }, categories).amountCents).toBe(100_000_000)
  })

  it("avisa de una categoría que no existe", () => {
    const result = parseQuickAddParams({ categoria: "Nada" }, categories)
    expect(result.categoryId).toBeUndefined()
    expect(result.invalid).toEqual(["categoria"])
    expect(result.unknownCategory).toBe("Nada")
  })

  it("sin parámetros no prellena nada ni avisa", () => {
    expect(parseQuickAddParams({}, categories)).toEqual({ invalid: [] })
  })

  it("con parámetros repetidos usa el primero e ignora textos demasiado largos", () => {
    const result = parseQuickAddParams(
      { importe: ["5", "9"], descripcion: "x".repeat(200) },
      categories,
    )
    expect(result.amountCents).toBe(500)
    expect(result.description).toBeUndefined()
  })
})

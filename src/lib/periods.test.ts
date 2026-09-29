import { describe, expect, it } from "vitest"

import { addMonths, comparisonRange, monthRange, percentChange, resolveMonth } from "./periods"

describe("periodos", () => {
  it("suma y resta meses cruzando años", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12")
    expect(addMonths("2026-12", 1)).toBe("2027-01")
  })

  it("rango de un mes", () => {
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-03-01" })
    expect(monthRange("2026-12")).toEqual({ from: "2026-12-01", to: "2027-01-01" })
  })

  it("acepta solo meses válidos y no futuros", () => {
    expect(resolveMonth("2026-08", "2026-09")).toBe("2026-08")
    expect(resolveMonth("2026-10", "2026-09")).toBe("2026-09")
    expect(resolveMonth("2026-13", "2026-09")).toBe("2026-09")
    expect(resolveMonth("hola", "2026-09")).toBe("2026-09")
    expect(resolveMonth(undefined, "2026-09")).toBe("2026-09")
  })

  it("el mes en curso se compara con los mismos días del anterior", () => {
    expect(comparisonRange("2026-09", "2026-09-10")).toEqual({
      from: "2026-08-01",
      to: "2026-08-11",
    })
  })

  it("si el mes anterior es más corto, se compara con él entero", () => {
    expect(comparisonRange("2026-03", "2026-03-31")).toEqual({
      from: "2026-02-01",
      to: "2026-03-01",
    })
  })

  it("un mes ya terminado se compara con el anterior completo", () => {
    expect(comparisonRange("2026-08", "2026-09-10")).toEqual(monthRange("2026-07"))
  })

  it("variación porcentual", () => {
    expect(percentChange(112, 100)).toBe(12)
    expect(percentChange(50, 100)).toBe(-50)
    expect(percentChange(50, 0)).toBeNull()
  })
})

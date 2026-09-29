import { describe, expect, it } from "vitest"

import { buildCategoryBreakdown, describeDelta } from "./stats-view"

const clean = (text?: string) => text?.replace(/ /g, " ")
const row = (name: string, total: number, color = "amber") => ({
  category_id: name,
  name,
  emoji: "🍽️",
  color,
  total_cents: total,
  expense_count: 1,
})

describe("reparto por categoría", () => {
  const rows = [
    row("A", 4000),
    row("B", 2000),
    row("C", 1000),
    row("D", 1000),
    row("E", 800),
    row("F", 600),
    row("G", 400),
    row("H", 200, "rara"),
  ]

  it("muestra las 6 mayores y agrupa el resto en Otros", () => {
    const items = buildCategoryBreakdown(rows, { top: 6, othersLabel: "Otros" })
    expect(items.map((i) => i.name)).toEqual(["A", "B", "C", "D", "E", "F", "Otros"])
    const others = items.at(-1)
    expect(clean(others?.amount)).toBe("6,00 €")
    expect(others?.color).toBe("other")
  })

  it("los porcentajes son sobre el total", () => {
    const [first] = buildCategoryBreakdown(rows, { top: 6, othersLabel: "Otros" })
    expect(first?.share).toBe(0.4)
    expect(clean(first?.percent)).toBe("40 %")
  })

  it("sin Otros, solo las mayores", () => {
    const items = buildCategoryBreakdown(rows, {
      top: 3,
      othersLabel: "Otros",
      includeOthers: false,
    })
    expect(items.map((i) => i.name)).toEqual(["A", "B", "C"])
  })

  it("un color desconocido pasa a neutro y sin gastos no hay filas", () => {
    expect(
      buildCategoryBreakdown([row("H", 200, "rara")], { top: 6, othersLabel: "Otros" })[0]?.color,
    ).toBe("other")
    expect(buildCategoryBreakdown([], { top: 6, othersLabel: "Otros" })).toEqual([])
  })
})

describe("comparación con el periodo anterior", () => {
  const labels = {
    more: "{percent} más que {period}",
    less: "{percent} menos que {period}",
    same: "Igual que {period}",
  }

  it("más, menos, igual y sin datos", () => {
    expect(clean(describeDelta(12, labels, "en agosto")?.label)).toBe("12 % más que en agosto")
    expect(describeDelta(12, labels, "en agosto")?.direction).toBe("up")
    expect(clean(describeDelta(-30, labels, "en agosto")?.label)).toBe("30 % menos que en agosto")
    expect(describeDelta(0, labels, "en agosto")).toEqual({
      direction: "same",
      label: "Igual que en agosto",
    })
    expect(describeDelta(null, labels, "en agosto")).toBeNull()
  })
})

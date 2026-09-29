import { describe, expect, it } from "vitest"

import { groupExpensesByDay, toRecentExpenses, type ExpenseRow } from "./expense-view"

const labels = { today: "Hoy", yesterday: "Ayer" }
const now = new Date("2026-10-01T10:00:00Z")
const clean = (text?: string) => text?.replace(/ /g, " ")

const row = (overrides: Partial<ExpenseRow>): ExpenseRow => ({
  id: crypto.randomUUID(),
  amount_cents: 1000,
  description: null,
  note: null,
  spent_at: "2026-10-01T08:00:00Z",
  category_id: "c1",
  category_name: "Comida",
  category_emoji: "🍽️",
  category_color: "amber",
  day: "2026-10-01",
  day_total_cents: 1000,
  ...overrides,
})

describe("vista de gastos", () => {
  it("agrupa por día con etiqueta y total", () => {
    const groups = groupExpensesByDay(
      [
        row({ description: "Mercadona", day_total_cents: 3000 }),
        row({ amount_cents: 2000, spent_at: "2026-10-01T07:00:00Z", day_total_cents: 3000 }),
        row({ spent_at: "2026-09-30T18:00:00Z", day: "2026-09-30", day_total_cents: 1000 }),
      ],
      { labels, now },
    )
    expect(groups.map((g) => [g.label, clean(g.total), g.items.length])).toEqual([
      ["Hoy", "30,00 €", 2],
      ["Ayer", "10,00 €", 1],
    ])
  })

  it("usa el concepto como título y, si no hay, la categoría", () => {
    const [group] = groupExpensesByDay(
      [row({ description: "Mercadona" }), row({ spent_at: "2026-10-01T07:05:00Z" })],
      { labels, now },
    )
    expect(group?.items.map((i) => [i.title, i.subtitle])).toEqual([
      ["Mercadona", "Comida · 10:00"],
      ["Comida", "09:05"],
    ])
  })

  it("en el Inicio indica el momento relativo", () => {
    const [item] = toRecentExpenses([row({ amount_cents: 1250 })], { labels, now })
    expect(item?.subtitle).toBe("Hoy · 10:00")
    expect(clean(item?.amount)).toBe("12,50 €")
  })
})

import { describe, expect, it } from "vitest"

import { pickBudgetNotice, totalBudgetRing, type BudgetStatusRow } from "./budget-view"

const labels = {
  over: "Te has pasado del presupuesto de {name}",
  overTotal: "Te has pasado del presupuesto del mes",
  warning: "Vas por el {percent} del presupuesto de {name}",
  warningTotal: "Vas por el {percent} del presupuesto del mes",
  ok: "Vas bien: todo dentro de tus presupuestos",
  okTotal: "Vas bien: llevas {spent} de {budget} este mes",
}
const clean = (text?: string) => text?.replace(/ /g, " ")

const total = (amount: number, spent: number): BudgetStatusRow => ({
  category_id: null,
  name: null,
  emoji: null,
  amount_cents: amount,
  spent_cents: spent,
})
const category = (name: string, amount: number, spent: number): BudgetStatusRow => ({
  category_id: name,
  name,
  emoji: "🍻",
  amount_cents: amount,
  spent_cents: spent,
})

describe("aviso de presupuesto", () => {
  it("sin presupuestos no hay aviso", () => {
    expect(pickBudgetNotice([], labels)).toBeNull()
  })

  it("lo que se ha pasado va primero, y lo más pasado antes", () => {
    const notice = pickBudgetNotice(
      [total(100000, 50000), category("Ocio", 10000, 12000), category("Cafés", 2000, 3000)],
      labels,
    )
    expect(notice).toEqual({ tone: "over", message: "Te has pasado del presupuesto de Cafés" })
  })

  it("avisa desde el 80 % y redondea hacia abajo", () => {
    expect(
      clean(
        pickBudgetNotice([total(100000, 10000), category("Ocio", 10000, 8000)], labels)?.message,
      ),
    ).toBe("Vas por el 80 % del presupuesto de Ocio")
    expect(pickBudgetNotice([category("Ocio", 10000, 7999)], labels)?.tone).toBe("ok")
    expect(clean(pickBudgetNotice([total(10000, 9990)], labels)?.message)).toBe(
      "Vas por el 99 % del presupuesto del mes",
    )
  })

  it("justo en el límite es aviso, no exceso", () => {
    expect(pickBudgetNotice([category("Ocio", 10000, 10000)], labels)?.tone).toBe("warning")
  })

  it("si todo va bien, dice cuánto llevas del total", () => {
    expect(clean(pickBudgetNotice([total(80000, 20000)], labels)?.message)).toBe(
      "Vas bien: llevas 200,00 € de 800,00 € este mes",
    )
    expect(pickBudgetNotice([category("Ocio", 10000, 100)], labels)?.message).toBe(labels.ok)
  })
})

describe("anillo del presupuesto total", () => {
  it("solo con presupuesto total", () => {
    expect(totalBudgetRing([category("Ocio", 10000, 100)], "{percent} usado")).toBeUndefined()
    const ring = totalBudgetRing([total(80000, 20000)], "{percent} usado")
    expect(ring?.value).toBe(0.25)
    expect(clean(ring?.label)).toBe("25 %")
    expect(clean(ring?.ariaLabel)).toBe("25 % usado")
  })
})

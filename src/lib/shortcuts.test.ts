import { describe, expect, it } from "vitest"

import { parseQuickAddParams } from "./quick-add-params"
import { shortcutLinks } from "./shortcuts"

describe("enlaces de los atajos", () => {
  const links = shortcutLinks("https://zumito.app", "Cafés")

  it("apuntan a /add con el importe al final para la variable del atajo", () => {
    expect(links.amount).toBe("https://zumito.app/add?importe=")
    expect(links.plain).toBe("https://zumito.app/add")
    expect(links.category).toBe("https://zumito.app/add?categoria=Caf%C3%A9s&importe=")
  })

  it("lo que añade el atajo (12,5 o 12.5) llega bien al formulario", () => {
    const categories = [{ id: "c1", name: "Cafés" }]
    for (const amount of ["12,5", "12.5"]) {
      const url = new URL(`${links.category}${amount}`)
      const prefill = parseQuickAddParams(Object.fromEntries(url.searchParams), categories)
      expect(prefill.amountCents).toBe(1250)
      expect(prefill.categoryId).toBe("c1")
    }
  })

  it("sin categoría no hay enlace de categoría", () => {
    expect(shortcutLinks("https://zumito.app").category).toBeNull()
  })
})

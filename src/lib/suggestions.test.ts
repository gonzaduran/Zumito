import { describe, expect, it } from "vitest"

import { safeNextPath } from "./safe-next"
import { findByName, normalizeName, suggest } from "./suggestions"

const places = [
  { id: "1", name: "Mercadona", uses: 12 },
  { id: "2", name: "Bar Manolo", uses: 3 },
  { id: "3", name: "Mercado Central", uses: 1 },
  { id: "4", name: "Café Comercial", uses: 5 },
  { id: "5", name: "Carrefour Market", uses: 8 },
]

describe("sugerencias de lugar", () => {
  it("sin texto, las más usadas", () => {
    expect(suggest("", places, 3).map((p) => p.name)).toEqual([
      "Mercadona",
      "Carrefour Market",
      "Café Comercial",
    ])
  })

  it("primero las que empiezan por el texto (por uso) y luego las que lo contienen", () => {
    expect(suggest("mer", places).map((p) => p.name)).toEqual([
      "Mercadona",
      "Mercado Central",
      "Café Comercial",
    ])
  })

  it("sin distinguir tildes ni mayúsculas, y sin repetir lo ya escrito", () => {
    expect(suggest("CAFE", places).map((p) => p.name)).toEqual(["Café Comercial"])
    expect(suggest("café comercial", places)).toEqual([])
  })

  it("encuentra por nombre exacto normalizado", () => {
    expect(findByName(places, "  bar MANOLO ")?.id).toBe("2")
    expect(findByName(places, "")).toBeUndefined()
    expect(normalizeName(" Ñandú ")).toBe("nandu")
  })
})

describe("ruta de vuelta tras el login", () => {
  it("acepta rutas internas con sus parámetros", () => {
    expect(safeNextPath("/add?categoria=Caf%C3%A9&importe=3")).toBe(
      "/add?categoria=Caf%C3%A9&importe=3",
    )
    expect(safeNextPath("/historial")).toBe("/historial")
  })

  it.each([
    "https://malo.com",
    "//malo.com",
    "/\\malo.com",
    "/\t/malo.com",
    "malo.com",
    "/login?next=/x",
    "/auth/confirm",
    "/onboarding",
    "",
    null,
    42,
  ])("rechaza %j", (value) => {
    expect(safeNextPath(value)).toBeNull()
  })
})

import { describe, expect, it } from "vitest"

import es from "@/i18n/dictionaries/es-ES.json"
import { isSingleEmoji } from "@/lib/validators/category"

import { EMOJI_CATALOG, searchEmojis, suggestEmojis } from "./emoji-catalog"

describe("catálogo de emojis", () => {
  it("tiene muchos emojis y todos son válidos para una categoría", () => {
    const all = EMOJI_CATALOG.flatMap((group) => group.emojis.map(([emoji]) => emoji))
    expect(all.length).toBeGreaterThan(200)
    expect(all.filter((emoji) => !isSingleEmoji(emoji))).toEqual([])
  })

  it("cada grupo tiene su nombre en el diccionario", () => {
    for (const group of EMOJI_CATALOG) expect(es.emojiPicker.groups).toHaveProperty(group.key)
  })

  it("sugiere el emoji a partir del nombre, sin importar tildes ni mayúsculas", () => {
    expect(suggestEmojis("Supermercado")[0]).toBe("🛒")
    expect(suggestEmojis("Súper")[0]).toBe("🛒")
    expect(suggestEmojis("Gasolina")[0]).toBe("⛽")
    expect(suggestEmojis("Gym")[0]).toBe("🏋️")
    expect(suggestEmojis("Peluquería")).toContain("💇")
    expect(suggestEmojis("xyz")).toEqual([])
  })

  it("busca por el principio de las palabras clave", () => {
    expect(searchEmojis("gaso")).toContain("⛽")
    expect(searchEmojis("mercadona")).toContain("🛒")
    expect(searchEmojis("")).toEqual([])
  })

  it("las ideas de categorías tienen un emoji válido", () => {
    expect(es.categories.ideas.length).toBeGreaterThan(40)
    expect(es.categories.ideas.filter((idea) => !isSingleEmoji(idea.emoji))).toEqual([])
  })
})

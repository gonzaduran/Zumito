import { describe, expect, it } from "vitest"

import es from "@/i18n/dictionaries/es-ES.json"

import { emailSchema, otpSchema } from "./auth"
import { budgetInputSchema } from "./budget"
import { categoryInputSchema } from "./category"
import { expenseInputSchema } from "./expense"
import { onboardingInputSchema } from "./onboarding"

const uuid = "8f14e45f-ceea-467a-9575-6c2a1c8e2b3d"
const firstMessage = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message

describe("gasto", () => {
  const base = { categoryId: uuid, amountCents: 1840, spentAt: new Date() }

  it("acepta un gasto válido y limpia los textos", () => {
    const result = expenseInputSchema.parse({ ...base, description: "  Mercadona  ", note: "  " })
    expect(result.description).toBe("Mercadona")
    expect(result.note).toBeUndefined()
  })

  it.each([
    [0, "amountRequired"],
    [-5, "amountRequired"],
    [12.5, "amountInvalid"],
    [100_000_001, "amountTooHigh"],
  ])("rechaza el importe %s con %s", (amountCents, key) => {
    expect(firstMessage(expenseInputSchema.safeParse({ ...base, amountCents }))).toBe(key)
  })

  it("exige categoría y fecha válidas", () => {
    expect(firstMessage(expenseInputSchema.safeParse({ ...base, categoryId: "x" }))).toBe(
      "categoryRequired",
    )
    expect(firstMessage(expenseInputSchema.safeParse({ ...base, spentAt: new Date("x") }))).toBe(
      "dateInvalid",
    )
  })
})

describe("categoría", () => {
  it.each(["🍽️", "👨‍👩‍👧", "🇪🇸", "☕"])("acepta el emoji %s", (emoji) => {
    expect(categoryInputSchema.safeParse({ name: "Comida", emoji, color: "amber" }).success).toBe(
      true,
    )
  })

  it.each(["", "a", "🍽️🍻", "ab"])("rechaza el emoji %j", (emoji) => {
    expect(
      firstMessage(categoryInputSchema.safeParse({ name: "Comida", emoji, color: "amber" })),
    ).toBe("emojiInvalid")
  })

  it("exige nombre y un color de la paleta", () => {
    expect(
      firstMessage(categoryInputSchema.safeParse({ name: "  ", emoji: "☕", color: "amber" })),
    ).toBe("categoryNameRequired")
    expect(
      firstMessage(categoryInputSchema.safeParse({ name: "Café", emoji: "☕", color: "orange" })),
    ).toBe("colorInvalid")
  })
})

describe("presupuesto, acceso y onboarding", () => {
  it("admite presupuesto total (sin categoría)", () => {
    expect(budgetInputSchema.safeParse({ categoryId: null, amountCents: 80000 }).success).toBe(true)
  })

  it("normaliza el email y valida el código", () => {
    expect(emailSchema.parse("  Ana@Test.ES ")).toBe("ana@test.es")
    expect(otpSchema.safeParse("123456").success).toBe(true)
    expect(firstMessage(otpSchema.safeParse("12a456"))).toBe("codeInvalid")
  })

  it("exige al menos una categoría conocida y quita duplicados", () => {
    expect(firstMessage(onboardingInputSchema.safeParse({ displayName: "", categories: [] }))).toBe(
      "categoriesRequired",
    )
    expect(
      onboardingInputSchema.safeParse({ displayName: "", categories: ["food", "hackeo"] }).success,
    ).toBe(false)
    expect(onboardingInputSchema.parse({ displayName: " ", categories: ["food", "food"] })).toEqual(
      { displayName: null, categories: ["food"] },
    )
  })
})

it("todas las claves de validación tienen texto en es-ES", () => {
  const keys = [
    "amountRequired",
    "amountInvalid",
    "amountTooHigh",
    "categoryRequired",
    "categoryNameRequired",
    "categoryNameTooLong",
    "emojiInvalid",
    "colorInvalid",
    "dateInvalid",
    "textTooLong",
    "emailInvalid",
    "codeInvalid",
    "categoriesRequired",
  ]
  for (const key of keys) expect(es.validation).toHaveProperty(key)
})

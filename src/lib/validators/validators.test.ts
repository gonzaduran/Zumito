import { describe, expect, it } from "vitest"

import es from "@/i18n/dictionaries/es-ES.json"

import { emailSchema, passwordSchema } from "./auth"
import { budgetInputSchema } from "./budget"
import { categoryInputSchema } from "./category"
import { expenseInputSchema } from "./expense"
import { incomeInputSchema, recurringIncomeInputSchema } from "./income"
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

describe("detalles del gasto", () => {
  const base = { categoryId: uuid, amountCents: 1840, spentAt: new Date() }

  it("acepta lugar, ánimo, personas y personas nuevas", () => {
    const result = expenseInputSchema.parse({
      ...base,
      place: "  La Parra ",
      mood: "good",
      personIds: [uuid],
      newPeople: [" Marta "],
    })
    expect(result.place).toBe("La Parra")
    expect(result.newPeople).toEqual(["Marta"])
  })

  it("rechaza un ánimo desconocido y personas no válidas", () => {
    expect(expenseInputSchema.safeParse({ ...base, mood: "eufórico" }).success).toBe(false)
    expect(expenseInputSchema.safeParse({ ...base, personIds: ["x"] }).success).toBe(false)
    expect(expenseInputSchema.safeParse({ ...base, newPeople: ["   "] }).success).toBe(false)
  })

  it("no admite más de 20 personas entre guardadas y nuevas", () => {
    const result = expenseInputSchema.safeParse({
      ...base,
      personIds: Array.from({ length: 15 }, () => uuid),
      newPeople: Array.from({ length: 6 }, (_, i) => `P${i}`),
    })
    expect(firstMessage(result)).toBe("tooManyPeople")
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

  it("normaliza el email y valida la contraseña", () => {
    expect(emailSchema.parse("  Ana@Test.ES ")).toBe("ana@test.es")
    expect(passwordSchema.safeParse("12345678").success).toBe(true)
    expect(firstMessage(passwordSchema.safeParse("1234567"))).toBe("passwordTooShort")
    expect(firstMessage(passwordSchema.safeParse("x".repeat(73)))).toBe("passwordTooLong")
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
    "passwordTooShort",
    "passwordTooLong",
    "categoriesRequired",
    "tooManyPeople",
    "descriptionRequired",
    "dayInvalid",
  ]
  for (const key of keys) expect(es.validation).toHaveProperty(key)
})

describe("ingresos", () => {
  it("un ingreso necesita concepto, importe y fecha válidos", () => {
    expect(
      incomeInputSchema.safeParse({
        description: " Bizum ",
        amountCents: 2500,
        receivedOn: "2026-09-30",
      }).data?.description,
    ).toBe("Bizum")
    expect(
      firstMessage(
        incomeInputSchema.safeParse({
          description: "  ",
          amountCents: 2500,
          receivedOn: "2026-09-30",
        }),
      ),
    ).toBe("descriptionRequired")
    expect(
      firstMessage(
        incomeInputSchema.safeParse({
          description: "x",
          amountCents: 2500,
          receivedOn: "30/09/2026",
        }),
      ),
    ).toBe("dateInvalid")
  })

  it("la nómina se cobra un día del 1 al 31", () => {
    const base = { description: "Nómina", amountCents: 145000 }
    expect(recurringIncomeInputSchema.safeParse({ ...base, dayOfMonth: 31 }).success).toBe(true)
    expect(firstMessage(recurringIncomeInputSchema.safeParse({ ...base, dayOfMonth: 0 }))).toBe(
      "dayInvalid",
    )
    expect(firstMessage(recurringIncomeInputSchema.safeParse({ ...base, dayOfMonth: 32 }))).toBe(
      "dayInvalid",
    )
    expect(firstMessage(recurringIncomeInputSchema.safeParse({ ...base, dayOfMonth: 1.5 }))).toBe(
      "dayInvalid",
    )
    expect(
      firstMessage(
        recurringIncomeInputSchema.safeParse({ ...base, amountCents: 0, dayOfMonth: 1 }),
      ),
    ).toBe("amountRequired")
  })
})

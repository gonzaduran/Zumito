import { z } from "zod"

import { msg } from "./messages"
import { amountCentsSchema } from "./money"

/** Texto opcional: se recorta y, si queda vacío, se guarda como `undefined`. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, msg("textTooLong"))
    .transform((value) => value || undefined)
    .optional()

export const moods = ["good", "neutral", "bad"] as const
export type Mood = (typeof moods)[number]

/** Máximo de personas por gasto (igual que en la base de datos). */
export const MAX_PEOPLE_PER_EXPENSE = 20

export const expenseInputSchema = z
  .object({
    /** Generado en el cliente para el guardado optimista y la sincronización offline. */
    id: z.uuid().optional(),
    categoryId: z.uuid(msg("categoryRequired")),
    amountCents: amountCentsSchema,
    description: optionalText(80),
    note: optionalText(500),
    spentAt: z.date(msg("dateInvalid")),
    /** Nombre del lugar; si no existe, se crea. */
    place: optionalText(80),
    mood: z.enum(moods).optional(),
    /** Personas ya guardadas. */
    personIds: z.array(z.uuid()).max(MAX_PEOPLE_PER_EXPENSE).optional(),
    /** Personas nuevas, por nombre; se crean al guardar. */
    newPeople: z
      .array(z.string().trim().min(1).max(40, msg("textTooLong")))
      .max(MAX_PEOPLE_PER_EXPENSE)
      .optional(),
  })
  .refine(
    (value) =>
      (value.personIds?.length ?? 0) + (value.newPeople?.length ?? 0) <= MAX_PEOPLE_PER_EXPENSE,
    { message: msg("tooManyPeople"), path: ["personIds"] },
  )

export type ExpenseInput = z.infer<typeof expenseInputSchema>

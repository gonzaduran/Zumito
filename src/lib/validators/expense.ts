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

export const expenseInputSchema = z.object({
  /** Generado en el cliente para el guardado optimista y la sincronización offline. */
  id: z.uuid().optional(),
  categoryId: z.uuid(msg("categoryRequired")),
  amountCents: amountCentsSchema,
  description: optionalText(80),
  note: optionalText(500),
  spentAt: z.date(msg("dateInvalid")),
})

export type ExpenseInput = z.infer<typeof expenseInputSchema>

import { z } from "zod"

import { amountCentsSchema } from "./money"

export const budgetInputSchema = z.object({
  /** `null` = presupuesto total del mes. */
  categoryId: z.uuid().nullable(),
  amountCents: amountCentsSchema,
})

export type BudgetInput = z.infer<typeof budgetInputSchema>

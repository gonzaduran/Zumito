import { z } from "zod"

import { msg } from "./messages"
import { amountCentsSchema } from "./money"

const descriptionSchema = z
  .string()
  .trim()
  .min(1, msg("descriptionRequired"))
  .max(80, msg("textTooLong"))

/** Ingreso a mano: concepto, importe y día (aaaa-mm-dd). */
export const incomeInputSchema = z.object({
  description: descriptionSchema,
  amountCents: amountCentsSchema,
  receivedOn: z.iso.date(msg("dateInvalid")),
})

/** Ingreso programado (la nómina): se apunta solo el día indicado de cada mes. */
export const recurringIncomeInputSchema = z.object({
  description: descriptionSchema,
  amountCents: amountCentsSchema,
  dayOfMonth: z.int(msg("dayInvalid")).min(1, msg("dayInvalid")).max(31, msg("dayInvalid")),
})

export type IncomeInput = z.infer<typeof incomeInputSchema>
export type RecurringIncomeInput = z.infer<typeof recurringIncomeInputSchema>

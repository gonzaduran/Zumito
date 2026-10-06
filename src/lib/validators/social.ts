import { z } from "zod"

import { msg } from "./messages"
import { amountCentsSchema } from "./money"

/** @usuario: de 3 a 20 letras minúsculas, números, punto o guion bajo (como en la base de datos). */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) => value.replace(/^@/, ""))
  .pipe(z.string().regex(/^[a-z0-9_.]{3,20}$/, msg("usernameInvalid")))

/** Gasto compartido: el total, quién pagó y la parte de cada uno (incluida la tuya). */
export const sharedExpenseInputSchema = z
  .object({
    id: z.uuid(),
    categoryId: z.uuid(msg("categoryRequired")),
    accountId: z.uuid().optional(),
    amountCents: amountCentsSchema,
    description: z
      .string()
      .trim()
      .max(80, msg("textTooLong"))
      .transform((value) => value || undefined)
      .optional(),
    spentAt: z.date(msg("dateInvalid")),
    payerId: z.uuid(),
    shares: z
      .array(z.object({ userId: z.uuid(), shareCents: z.int().positive(msg("sharesMismatch")) }))
      .min(2, msg("sharesMismatch"))
      .max(20),
  })
  .refine((value) => value.shares.reduce((sum, s) => sum + s.shareCents, 0) === value.amountCents, {
    message: msg("sharesMismatch"),
    path: ["shares"],
  })
  .refine((value) => new Set(value.shares.map((s) => s.userId)).size === value.shares.length, {
    message: msg("sharesMismatch"),
    path: ["shares"],
  })
  .refine((value) => value.shares.some((s) => s.userId === value.payerId), {
    message: msg("sharesMismatch"),
    path: ["payerId"],
  })

export type SharedExpenseInput = z.infer<typeof sharedExpenseInputSchema>

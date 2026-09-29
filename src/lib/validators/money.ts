import { z } from "zod"

import { msg } from "./messages"

/** Máximo permitido por la base de datos: 1.000.000,00 €. */
export const MAX_AMOUNT_CENTS = 100_000_000

/** Importe en céntimos: entero, mayor que 0 y dentro del límite. */
export const amountCentsSchema = z
  .number({ error: msg("amountRequired") })
  .int(msg("amountInvalid"))
  .positive(msg("amountRequired"))
  .max(MAX_AMOUNT_CENTS, msg("amountTooHigh"))

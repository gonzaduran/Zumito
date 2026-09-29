import { z } from "zod"

import { msg } from "./messages"

export const emailSchema = z.email(msg("emailInvalid")).trim().toLowerCase()

/** Código de un solo uso que envía Supabase por email (6 dígitos por defecto, hasta 8). */
export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6,8}$/, msg("codeInvalid"))

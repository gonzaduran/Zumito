import { z } from "zod"

import { msg } from "./messages"

/** Se recorta antes de validar: el autocompletado del móvil suele añadir un espacio al final. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email(msg("emailInvalid")))

/** Código de un solo uso que envía Supabase por email (6 dígitos por defecto, hasta 8). */
export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6,8}$/, msg("codeInvalid"))

import { z } from "zod"

import { msg } from "./messages"

/** Se recorta antes de validar: el autocompletado del móvil suele añadir un espacio al final. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email(msg("emailInvalid")))

/** Mínimo 8 caracteres (igual que en Supabase). 72 es el máximo que admite bcrypt. */
export const passwordSchema = z
  .string()
  .min(8, msg("passwordTooShort"))
  .max(72, msg("passwordTooLong"))

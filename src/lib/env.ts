import { z } from "zod"

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
})

/** Variables públicas (se incluyen en el cliente). La service role key nunca va aquí. */
export function getPublicEnv() {
  // Next solo sustituye las NEXT_PUBLIC_* si se leen de forma literal.
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  })

  if (!result.success) {
    throw new Error(
      `Faltan variables de entorno de Supabase. Copia .env.example a .env.local y rellénalas.\n${z.prettifyError(result.error)}`,
    )
  }

  return result.data
}

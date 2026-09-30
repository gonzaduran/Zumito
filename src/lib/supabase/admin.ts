import "server-only"

import { createClient } from "@supabase/supabase-js"

import { getPublicEnv } from "@/lib/env"
import type { Database } from "@/types/database"

/**
 * Cliente con la clave secreta de Supabase: se salta RLS. Solo para lo que no tiene
 * sesión de usuario (el webhook de Stripe) o necesita escribir la suscripción.
 * Nunca se importa desde un componente cliente ("server-only" lo impide al compilar).
 */
export function createAdminClient(secretKey: string) {
  return createClient<Database>(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

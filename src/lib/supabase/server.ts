import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { getPublicEnv } from "@/lib/env"
import type { Database } from "@/types/database"

/** Cliente de Supabase para Server Components, Server Actions y Route Handlers. Uno por petición. */
export async function createClient() {
  const cookieStore = await cookies()
  const env = getPublicEnv()

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Desde un Server Component no se pueden escribir cookies.
            // La sesión la refrescará el proxy (se añade con la autenticación).
          }
        },
      },
    },
  )
}

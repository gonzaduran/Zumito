import "server-only"

import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

/** Sesión verificada del usuario actual (una lectura por petición). */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return data?.claims ?? null
})

/** Perfil del usuario actual, o `null` si no hay sesión. */
export const getCurrentProfile = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, onboarded_at")
    .maybeSingle()
  if (error) throw error
  return data
})

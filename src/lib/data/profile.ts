import "server-only"

import { cache } from "react"

import { resolveEntitlement, type Entitlement } from "@/lib/billing/plans"
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
    .select("display_name, onboarded_at, timezone")
    .maybeSingle()
  if (error) throw error
  return data
})

/** Plan del usuario actual, calculado siempre en el servidor (nunca se confía en el cliente). */
export const getEntitlement = cache(async (): Promise<Entitlement> => {
  const supabase = await createClient()
  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from("profiles").select("premium_comp").maybeSingle(),
    supabase
      .from("subscriptions")
      .select(
        "status, billing_interval, trial_end, current_period_end, cancel_at_period_end, trial_used",
      )
      .maybeSingle(),
  ])
  return resolveEntitlement(profile, subscription)
})

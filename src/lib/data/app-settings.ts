import "server-only"

import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

/** ¿Está abierta la beta (todo gratis)? Se puede leer también sin sesión. */
export const getBetaOpen = cache(async (): Promise<boolean> => {
  const supabase = await createClient()
  const { data } = await supabase.from("app_settings").select("beta_open").maybeSingle()
  return data?.beta_open ?? false
})

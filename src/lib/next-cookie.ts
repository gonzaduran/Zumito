import "server-only"

import { cookies } from "next/headers"

import { safeNextPath } from "@/lib/safe-next"
import type { createClient } from "@/lib/supabase/server"

/**
 * Ruta a la que volver tras entrar (p. ej. /add?importe=3). Se guarda en una cookie
 * para no perderla si se entra con el enlace del email o se pasa por el onboarding.
 */
const COOKIE = "zumito-next"
const MAX_AGE_SECONDS = 60 * 60

export async function rememberNext(next: string | null) {
  const store = await cookies()
  if (next) {
    store.set(COOKIE, next, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    })
  } else {
    store.delete(COOKIE)
  }
}

/** Ruta guardada (validada de nuevo) o `null`. */
export async function readNext(): Promise<string | null> {
  return safeNextPath((await cookies()).get(COOKIE)?.value)
}

/**
 * A dónde ir justo después de entrar. Si el perfil ya hizo el onboarding, la ruta
 * guardada se consume; si no, se conserva para usarla al terminar el onboarding.
 */
export async function destinationAfterSignIn(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const next = await readNext()
  const { data: profile } = await supabase.from("profiles").select("onboarded_at").maybeSingle()
  if (profile?.onboarded_at) await rememberNext(null)
  return next ?? "/"
}

"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import type { Dictionary } from "@/i18n/get-dictionary"
import { rememberNext } from "@/lib/next-cookie"
import { safeNextPath } from "@/lib/safe-next"
import { createClient } from "@/lib/supabase/server"
import { emailSchema, passwordSchema } from "@/lib/validators/auth"

type AuthError = keyof Dictionary["auth"]["errors"]

export type AuthState = { error: AuthError | null }

const modeSchema = z.enum(["signin", "signup"])

/** Entrar o crear cuenta con email y contraseña. Sin correos de por medio. */
export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const mode = modeSchema.safeParse(formData.get("mode"))
  const email = emailSchema.safeParse(formData.get("email"))
  if (!mode.success || !email.success) return { error: "invalidEmail" }
  const password = passwordSchema.safeParse(formData.get("password"))
  if (!password.success) {
    // Al entrar no se da pistas sobre la contraseña: solo "email o contraseña incorrectos".
    if (mode.data === "signin") return { error: "invalidCredentials" }
    return {
      error:
        password.error.issues[0]?.message === "passwordTooLong"
          ? "passwordTooLong"
          : "passwordTooShort",
    }
  }

  const supabase = await createClient()
  const credentials = { email: email.data, password: password.data }

  if (mode.data === "signin") {
    const { error } = await supabase.auth.signInWithPassword(credentials)
    if (error) {
      if (error.status === 429) return { error: "tooManyRequests" }
      return {
        error: error.code === "email_not_confirmed" ? "emailNotConfirmed" : "invalidCredentials",
      }
    }
  } else {
    const { data, error } = await supabase.auth.signUp(credentials)
    if (error) {
      if (error.status === 429) return { error: "tooManyRequests" }
      if (error.code === "user_already_exists" || error.code === "email_exists") {
        return { error: "alreadyRegistered" }
      }
      if (error.code === "weak_password") return { error: "passwordTooShort" }
      return { error: "signUpFailed" }
    }
    // Si Supabase sigue pidiendo confirmar el email, no hay sesión todavía.
    if (!data.session) return { error: "emailNotConfirmed" }
  }

  // Vuelve a donde iba (p. ej. /add?importe=3). Si antes toca el onboarding (lo decide el
  // layout), la ruta se guarda en la cookie para usarla al terminarlo.
  const next = safeNextPath(formData.get("next"))
  const { data: profile } = await supabase.from("profiles").select("onboarded_at").maybeSingle()
  await rememberNext(profile?.onboarded_at ? null : next)
  redirect(next ?? "/")
}

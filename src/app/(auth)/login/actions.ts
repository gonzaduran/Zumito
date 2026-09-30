"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import type { Dictionary } from "@/i18n/get-dictionary"
import { destinationAfterSignIn, rememberNext } from "@/lib/next-cookie"
import { safeNextPath } from "@/lib/safe-next"
import { createClient } from "@/lib/supabase/server"
import { emailSchema, otpSchema } from "@/lib/validators/auth"

type AuthError = keyof Dictionary["auth"]["errors"]

export type SendCodeState = { email: string | null; error: AuthError | null; resent: boolean }
export type VerifyCodeState = { error: AuthError | null }

export async function sendCode(prev: SendCodeState, formData: FormData): Promise<SendCodeState> {
  const parsed = emailSchema.safeParse(formData.get("email"))
  if (!parsed.success) return { email: null, error: "invalidEmail", resent: false }

  const email = parsed.data
  // Ruta a la que volver tras entrar (también si se entra con el enlace del email).
  await rememberNext(safeNextPath(formData.get("next")))
  const origin = (await headers()).get("origin")
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: origin ? `${origin}/auth/confirm` : undefined,
    },
  })

  if (error) {
    return {
      email: prev.email,
      error: error.status === 429 ? "tooManyRequests" : "sendFailed",
      resent: false,
    }
  }
  return { email, error: null, resent: prev.email === email }
}

export async function verifyCode(
  _prev: VerifyCodeState,
  formData: FormData,
): Promise<VerifyCodeState> {
  const email = emailSchema.safeParse(formData.get("email"))
  const token = otpSchema.safeParse(formData.get("code"))
  if (!email.success || !token.success) return { error: "invalidCode" }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    email: email.data,
    token: token.data,
    type: "email",
  })
  if (error) return { error: "invalidCode" }

  // Vuelve a donde iba (p. ej. /add?importe=3). El layout decide si antes toca el onboarding.
  redirect(await destinationAfterSignIn(supabase))
}

import type { EmailOtpType } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

const EMAIL_OTP_TYPES: EmailOtpType[] = ["email", "magiclink", "signup"]

/** Destino del enlace del email: admite el flujo PKCE (`code`) y el de `token_hash`. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null

  const supabase = await createClient()
  let verified = false

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    verified = !error
  } else if (tokenHash && type && EMAIL_OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    verified = !error
  }

  redirect(verified ? "/" : "/login?error=link")
}

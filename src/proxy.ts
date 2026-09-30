import type { NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/proxy"

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  // Todo salvo estáticos, imágenes y el webhook de Stripe (sin sesión: se valida con su firma).
  matcher: [
    "/((?!_next/static|api/stripe/webhook|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|txt)$).*)",
  ],
}

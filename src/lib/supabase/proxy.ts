import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { getPublicEnv } from "@/lib/env"
import type { Database } from "@/types/database"

/** Rutas accesibles sin sesión. */
const PUBLIC_PATHS = ["/login", "/auth/confirm", "/serwist", "/~offline"]

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))

/**
 * Refresca la sesión de Supabase en cada petición y protege las rutas privadas:
 * sin sesión se va a /login y con sesión /login lleva al inicio.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const env = getPublicEnv()

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
        },
      },
    },
  )

  // Valida el JWT; no pongas código entre crear el cliente y esta llamada.
  const { data } = await supabase.auth.getClaims()
  const isLoggedIn = Boolean(data?.claims)
  const { pathname } = request.nextUrl

  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url))
    // Conserva las cookies de sesión refrescadas y las cabeceras anti-caché.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie)
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") redirect.headers.set(key, value)
    })
    return redirect
  }

  if (!isLoggedIn && !isPublicPath(pathname)) return redirectTo("/login")
  if (isLoggedIn && pathname === "/login") return redirectTo("/")

  return response
}

/** Rutas a las que no tiene sentido volver después de entrar. */
const EXCLUDED = ["/login", "/auth", "/onboarding", "/serwist", "/~offline"]

/**
 * Ruta interna a la que volver tras el login, o `null` si no es segura.
 * Solo rutas de la propia app: nada de "//otro.com", "https://…" ni "/\otro.com".
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 1000) return null
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null
  // Caracteres de control: algunos navegadores los ignoran y convierten "/\t/x" en "//x".
  if (/[\u0000-\u001f\u007f]/.test(value)) return null

  const base = "https://zumito.invalid"
  let url: URL
  try {
    url = new URL(value, base)
  } catch {
    return null
  }
  if (url.origin !== base) return null
  if (EXCLUDED.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))) {
    return null
  }
  return `${url.pathname}${url.search}`
}

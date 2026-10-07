import "server-only"

import { headers } from "next/headers"

/** Dirección pública de la app según la petición (https://zumito… o http://localhost en local). */
export async function appOrigin(): Promise<{ origin: string; host: string }> {
  const list = await headers()
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000"
  const protocol =
    list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  return { origin: `${protocol}://${host}`, host }
}

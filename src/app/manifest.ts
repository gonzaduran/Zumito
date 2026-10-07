import type { MetadataRoute } from "next"

import { defaultLocale } from "@/i18n/config"
import { getDictionary } from "@/i18n/get-dictionary"

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const dict = await getDictionary()
  return {
    id: "/",
    name: dict.app.name,
    short_name: dict.app.name,
    description: dict.app.description,
    lang: defaultLocale,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafafa",
    theme_color: "#fafafa",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Al mantener pulsado el icono de la app (Android): ir directo a lo más usado.
    shortcuts: [
      {
        name: dict.nav.add,
        short_name: dict.nav.add,
        url: "/add",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: dict.nav.history,
        url: "/historial",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: dict.friends.title,
        url: "/amigos",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  }
}

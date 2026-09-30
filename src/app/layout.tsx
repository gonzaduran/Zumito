import type { Metadata, Viewport } from "next"
import { SerwistProvider } from "@serwist/turbopack/react"
import { Inter, Manrope } from "next/font/google"

import { Toaster } from "@/components/ui/sonner"
import { defaultLocale } from "@/i18n/config"
import { getDictionary } from "@/i18n/get-dictionary"
import splashScreens from "@/lib/splash-screens.json"

import "./globals.css"

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
})

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
})

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary()
  return {
    applicationName: dict.app.name,
    title: dict.app.name,
    description: dict.app.description,
    appleWebApp: {
      capable: true,
      title: dict.app.name,
      statusBarStyle: "default",
      // Pantalla de carga de la app instalada en iPhone (logo sobre el fondo de la app).
      startupImage: splashScreens,
    },
    formatDetection: { telephone: false },
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0e" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={defaultLocale} className={`${manrope.variable} ${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {/* En desarrollo no se registra: evita servir versiones viejas desde la caché. */}
        <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === "development"}>
          {children}
          <Toaster />
        </SerwistProvider>
      </body>
    </html>
  )
}

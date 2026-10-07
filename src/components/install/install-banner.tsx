"use client"

import { Smartphone, X } from "lucide-react"
import Link from "next/link"
import { useState, useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { usePlatform } from "@/hooks/use-platform"
import type { Dictionary } from "@/i18n/get-dictionary"

const KEY = "zumito:install-banner-dismissed"

const readDismissed = () => {
  try {
    return localStorage.getItem(KEY) === "1"
  } catch {
    return false
  }
}
const noSubscription = () => () => {}

/** Aviso en el Inicio para instalar la app, hasta que se instala o se cierra. */
export function InstallBanner({ labels }: { labels: Dictionary["install"] }) {
  const platform = usePlatform()
  // En el servidor se da por cerrado: el aviso aparece tras hidratar.
  const stored = useSyncExternalStore(noSubscription, readDismissed, () => true)
  const [closed, setClosed] = useState(false)
  if (platform === "unknown" || platform === "installed" || stored || closed) return null

  return (
    <aside
      aria-label={labels.bannerTitle}
      className="flex items-center gap-3 rounded-lg bg-primary-wash p-4"
    >
      <Smartphone aria-hidden="true" className="size-6 shrink-0 text-primary-text" />
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">{labels.bannerTitle}</p>
        <p className="text-[13px]">{labels.bannerText}</p>
        <Link
          href="/ajustes/instalar"
          className="mt-1 inline-flex min-h-11 items-center text-sm font-bold text-primary-text outline-none focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {labels.bannerLink}
        </Link>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={labels.dismiss}
        onClick={() => {
          setClosed(true)
          try {
            localStorage.setItem(KEY, "1")
          } catch {
            // Sin almacenamiento: se cierra solo en esta visita.
          }
        }}
      >
        <X aria-hidden="true" className="size-5" />
      </Button>
    </aside>
  )
}

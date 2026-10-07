"use client"

import { ChevronRight, Download } from "lucide-react"
import Link from "next/link"

import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useInstallPrompt, usePlatform } from "@/hooks/use-platform"
import type { Dictionary } from "@/i18n/get-dictionary"

/** Invita a instalar la app (botón nativo si lo hay y enlace al tutorial). No aparece si ya está instalada. */
export function InstallAppCard({ labels }: { labels: Dictionary["install"] }) {
  // En el servidor no se sabe la plataforma: la tarjeta aparece tras hidratar.
  const platform = usePlatform()
  const install = useInstallPrompt()
  if (platform === "unknown" || platform === "installed") return null

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <Logo size={44} className="text-foreground" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{labels.title}</p>
          <p className="text-[13px] text-muted-foreground">
            {platform === "ios" ? labels.ios : labels.description}
          </p>
        </div>
        {install ? (
          <Button size="sm" onClick={install}>
            <Download />
            {labels.button}
          </Button>
        ) : null}
      </div>
      <Link
        href="/ajustes/instalar"
        className="flex min-h-11 items-center justify-between rounded-md text-sm font-bold text-primary-text outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {labels.howTo}
        <ChevronRight aria-hidden="true" className="size-5" />
      </Link>
    </Card>
  )
}

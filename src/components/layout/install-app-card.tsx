"use client"

import { Download } from "lucide-react"
import { useEffect, useState, useSyncExternalStore } from "react"

import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Dictionary } from "@/i18n/get-dictionary"

/** Evento de Chrome/Android para instalar la PWA (no está en los tipos del DOM). */
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> }

type Platform = "unknown" | "installed" | "ios" | "other"

function detectPlatform(): Platform {
  const installed =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && navigator.standalone === true)
  if (installed) return "installed"
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios" : "other"
}

const noSubscription = () => () => {}

/** Invita a instalar la app. No aparece si ya está instalada. */
export function InstallAppCard({ labels }: { labels: Dictionary["install"] }) {
  // En el servidor no se sabe la plataforma: la tarjeta aparece tras hidratar.
  const platform = useSyncExternalStore(noSubscription, detectPlatform, () => "unknown" as const)
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setPromptEvent(null)
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  // En iOS no hay botón de instalar: se explica cómo hacerlo desde Safari.
  const showIosHint = platform === "ios"
  const showPrompt = platform === "other" && promptEvent !== null
  if (!showIosHint && !showPrompt) return null

  return (
    <Card className="flex items-center gap-4">
      <Logo size={44} className="text-foreground" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{labels.title}</p>
        <p className="text-[13px] text-muted-foreground">
          {showIosHint ? labels.ios : labels.description}
        </p>
      </div>
      {showPrompt ? (
        <Button
          size="sm"
          onClick={async () => {
            await promptEvent.prompt()
            setPromptEvent(null)
          }}
        >
          <Download />
          {labels.button}
        </Button>
      ) : null}
    </Card>
  )
}

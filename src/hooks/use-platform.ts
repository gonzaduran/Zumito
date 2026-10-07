"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

export type Platform = "unknown" | "installed" | "ios" | "android" | "other"

function detectPlatform(): Platform {
  const installed =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && navigator.standalone === true)
  if (installed) return "installed"
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return "ios"
  return /android/i.test(navigator.userAgent) ? "android" : "other"
}

const noSubscription = () => () => {}

/** En qué móvil se está usando y si ya está instalada. En el servidor, "unknown". */
export function usePlatform(): Platform {
  return useSyncExternalStore(noSubscription, detectPlatform, () => "unknown" as const)
}

/** Evento de Chrome/Android para instalar la PWA (no está en los tipos del DOM). */
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> }

/**
 * Botón nativo de instalar (Chrome y Android). Devuelve `null` si el navegador no lo
 * ofrece (iPhone, o ya instalada).
 */
export function useInstallPrompt(): (() => Promise<void>) | null {
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

  if (!promptEvent) return null
  return async () => {
    await promptEvent.prompt()
    setPromptEvent(null)
  }
}

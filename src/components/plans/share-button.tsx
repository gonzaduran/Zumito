"use client"

import { Share2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

type ShareButtonProps = {
  label: string
  size?: "md" | "lg"
  variant?: "primary" | "secondary"
  title: string
  text: string
  copiedLabel: string
}

/** Comparte la app con el menú nativo del móvil; si no existe, copia el enlace. */
export function ShareButton({
  label,
  title,
  text,
  copiedLabel,
  size = "lg",
  variant = "secondary",
}: ShareButtonProps) {
  const share = async () => {
    const url = window.location.origin
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
      } catch {
        // Cancelado por el usuario: no hay nada que avisar.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      toast.success(copiedLabel)
    } catch {
      toast(url)
    }
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={share}>
      <Share2 aria-hidden="true" />
      {label}
    </Button>
  )
}

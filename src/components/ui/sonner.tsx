"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/** Contenedor de toasts. Llama a `toast("Gasto guardado")` desde cualquier sitio. */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="system"
      position="top-center"
      offset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      icons={{
        success: <CircleCheckIcon className="size-5 text-positive" />,
        info: <InfoIcon className="size-5 text-primary-text" />,
        warning: <TriangleAlertIcon className="size-5 text-cat-amber" />,
        error: <OctagonXIcon className="size-5 text-destructive" />,
        loading: <Loader2Icon className="size-5 motion-safe:animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-md)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "font-sans !shadow-card",
          title: "!font-bold",
          description: "!text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

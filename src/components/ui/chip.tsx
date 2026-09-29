"use client"

import { Toggle } from "@base-ui/react/toggle"
import { cn } from "cn"

/** Botón seleccionable en forma de píldora (filtros, personas, etiquetas). */
function Chip({ className, ...props }: Toggle.Props) {
  return (
    <Toggle
      data-slot="chip"
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-border bg-card px-4 text-[13px] font-bold whitespace-nowrap text-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-pressed:border-primary data-pressed:bg-primary-wash data-pressed:text-primary",
        className,
      )}
      {...props}
    />
  )
}

export { Chip }

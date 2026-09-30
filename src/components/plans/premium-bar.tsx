"use client"

import { Sparkles } from "lucide-react"
import type { ReactNode } from "react"

/**
 * Barra de compra fija justo encima de la barra inferior: siempre a mano, también al
 * hacer scroll. `action` es el botón o enlace (ir a planes o pagar directamente).
 */
export function PremiumBar({
  label,
  title,
  text,
  action,
}: {
  label: string
  title: string
  text: ReactNode
  action: ReactNode
}) {
  return (
    <>
      {/* Hueco para que la barra no tape el final de la página. */}
      <div aria-hidden="true" className="h-24 shrink-0" />
      <aside
        aria-label={label}
        className="fixed inset-x-0 bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom))] z-30 px-4 pb-2"
      >
        <div className="mx-auto flex max-w-lg items-center gap-3 rounded-lg bg-linear-155 from-primary to-primary-strong py-2.5 pr-2.5 pl-4 text-primary-foreground shadow-card">
          <Sparkles aria-hidden="true" className="size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">{title}</p>
            <p className="truncate text-xs font-semibold">{text}</p>
          </div>
          {action}
        </div>
      </aside>
    </>
  )
}

/** Estilo del botón blanco de la barra (sirve para <button> y <Link>). */
export const premiumBarActionClass =
  "flex h-11 shrink-0 items-center justify-center rounded-full bg-white px-4 text-sm font-extrabold text-primary-strong outline-none focus-visible:ring-3 focus-visible:ring-white/60 disabled:opacity-60"

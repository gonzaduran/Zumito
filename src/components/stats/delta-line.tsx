import { cn } from "cn"
import { ArrowDown, ArrowUp, Equal } from "lucide-react"

import type { Delta } from "@/lib/stats-view"

/** Comparación con el periodo anterior. Gastar más es aviso; gastar menos, buena noticia. */
export function DeltaLine({ delta, className }: { delta: Delta; className?: string }) {
  const Icon = delta.direction === "up" ? ArrowUp : delta.direction === "down" ? ArrowDown : Equal
  return (
    <p
      className={cn(
        "flex items-center gap-1 text-[13px] font-bold",
        delta.direction === "up" && "text-destructive",
        delta.direction === "down" && "text-positive",
        delta.direction === "same" && "text-muted-foreground",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-4" strokeWidth={2.6} />
      {delta.label}
    </p>
  )
}

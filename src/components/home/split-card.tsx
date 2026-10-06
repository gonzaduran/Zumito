import { cn } from "cn"
import Link from "next/link"

export type SplitCardItem = {
  id: string
  name: string
  emoji: string
  /** "Llevas 120,00 € de 420,00 €", "Te has pasado 5,00 €" o "Para apartar: 280,00 €". */
  status: string
  /** Uso de la parte (0-1+); `null` si no tiene categorías (es para apartar). */
  ratio: number | null
}

type SplitCardProps = {
  title: string
  editLabel: string
  editHref: string
  items: SplitCardItem[]
}

/** Cómo va cada parte del reparto de la nómina este mes. */
export function SplitCard({ title, editLabel, editHref, items }: SplitCardProps) {
  return (
    <section aria-labelledby="split-title">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id="split-title" className="text-[17px] font-extrabold">
          {title}
        </h2>
        <Link
          href={editHref}
          className="text-sm font-bold text-primary-text outline-none focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {editLabel}
        </Link>
      </div>
      <ul className="flex flex-col gap-3 rounded-lg bg-card p-4 shadow-card">
        {items.map((item) => {
          const over = item.ratio !== null && item.ratio > 1
          return (
            <li key={item.id}>
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="w-6 text-center text-lg">
                  {item.emoji}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{item.name}</span>
                <span
                  className={cn(
                    "text-right num text-[13px] font-bold",
                    over ? "text-destructive-text" : "text-muted-foreground",
                  )}
                >
                  {item.status}
                </span>
              </div>
              {item.ratio !== null ? (
                <div
                  aria-hidden="true"
                  className="mt-1.5 ml-9 h-1.5 overflow-hidden rounded-full bg-border"
                >
                  <div
                    className={cn("h-full rounded-full", over ? "bg-destructive" : "bg-primary")}
                    style={{ width: `${Math.min(item.ratio, 1) * 100}%` }}
                  />
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

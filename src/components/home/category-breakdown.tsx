import { categoryColorVar, type ChartColor } from "@/lib/category-colors"

import { SectionHeader } from "./section-header"

export type CategorySpending = {
  id: string
  emoji: string
  name: string
  /** Importe ya formateado. */
  amount: string
  /** Proporción de la barra (0-1). */
  share: number
  color: ChartColor
}

type CategoryBreakdownProps = {
  title: string
  seeAll: { href: string; label: string }
  items: CategorySpending[]
}

/** Gasto por categoría con barras de progreso. No se muestra si no hay datos. */
export function CategoryBreakdown({ title, seeAll, items }: CategoryBreakdownProps) {
  if (items.length === 0) return null

  return (
    <section>
      <SectionHeader title={title} link={seeAll} />
      <ul>
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
          >
            <span aria-hidden="true" className="w-[22px] text-center text-lg">
              {item.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex justify-between gap-3 text-[13px] font-bold">
                <span className="truncate">{item.name}</span>
                <span className="num">{item.amount}</span>
              </div>
              <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(Math.max(item.share, 0), 1) * 100}%`,
                    background: categoryColorVar(item.color),
                  }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

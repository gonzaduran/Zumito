import { Receipt } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"

import { SectionHeader } from "./section-header"

export type RecentExpense = {
  id: string
  emoji: string
  place: string
  /** Momento ya formateado, p. ej. "Hoy · 14:32". */
  when: string
  /** Importe ya formateado. */
  amount: string
}

type RecentExpensesProps = {
  title: string
  historyLink: { href: string; label: string }
  empty: { title: string; description: string }
  items: RecentExpense[]
}

/** Últimos movimientos. Sin datos, muestra el estado vacío. */
export function RecentExpenses({ title, historyLink, empty, items }: RecentExpensesProps) {
  if (items.length === 0) {
    return <EmptyState icon={Receipt} title={empty.title} description={empty.description} />
  }

  return (
    <section>
      <SectionHeader title={title} link={historyLink} />
      <ul>
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
          >
            <span
              aria-hidden="true"
              className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-secondary text-[17px]"
            >
              {item.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{item.place}</p>
              <p className="mt-px text-xs text-muted-foreground">{item.when}</p>
            </div>
            <span className="num text-sm font-extrabold">{item.amount}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

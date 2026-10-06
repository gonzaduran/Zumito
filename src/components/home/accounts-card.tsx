import { cn } from "cn"
import Link from "next/link"

export type AccountSummaryItem = {
  id: string
  name: string
  emoji: string
  /** "Gastado 120,00 €". */
  spent: string
  /** "Te quedan 80,00 €" o "Te has pasado 5,00 €", si la cuenta tiene ingresos este mes. */
  balance: { text: string; over: boolean } | null
}

/** Gasto del mes por cuenta (solo con más de una cuenta). Cada fila abre su historial. */
export function AccountsCard({ title, items }: { title: string; items: AccountSummaryItem[] }) {
  return (
    <section aria-labelledby="accounts-title">
      <h2 id="accounts-title" className="mb-2 text-[17px] font-extrabold">
        {title}
      </h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/historial?a=${item.id}`}
              className="flex min-h-16 items-center gap-3 rounded-lg bg-card px-4 py-3 shadow-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-lg"
              >
                {item.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{item.name}</span>
                <span className="block num text-[13px] text-muted-foreground">{item.spent}</span>
              </span>
              {item.balance ? (
                <span
                  className={cn(
                    "text-right num text-sm font-extrabold",
                    item.balance.over && "text-destructive-text",
                  )}
                >
                  {item.balance.text}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

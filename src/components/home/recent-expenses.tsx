import { Receipt } from "lucide-react"

import { ExpenseList } from "@/components/expenses/expense-list"
import { EmptyState } from "@/components/ui/empty-state"
import type { Category } from "@/lib/data/categories"
import type { ListedExpense } from "@/lib/expense-view"
import type { NamedOption } from "@/lib/suggestions"

import { SectionHeader } from "./section-header"

type RecentExpensesProps = {
  title: string
  historyLink: { href: string; label: string }
  empty: { title: string; description: string }
  items: ListedExpense[]
  categories: Category[]
  places: NamedOption[]
  people: NamedOption[]
  listLabels: React.ComponentProps<typeof ExpenseList>["labels"]
}

/** Últimos movimientos, editables. Sin datos, muestra el estado vacío. */
export function RecentExpenses({
  title,
  historyLink,
  empty,
  items,
  categories,
  places,
  people,
  listLabels,
}: RecentExpensesProps) {
  if (items.length === 0) {
    return <EmptyState icon={Receipt} title={empty.title} description={empty.description} />
  }

  return (
    <section>
      <SectionHeader title={title} link={historyLink} />
      <ExpenseList
        groups={[{ key: "recent", items }]}
        categories={categories}
        places={places}
        people={people}
        labels={listLabels}
      />
    </section>
  )
}

import { Receipt } from "lucide-react"

import { ExpenseList } from "@/components/expenses/expense-list"
import { EmptyState } from "@/components/ui/empty-state"
import type { Category } from "@/lib/data/categories"
import type { ListedExpense } from "@/lib/expense-view"

import { SectionHeader } from "./section-header"

type RecentExpensesProps = {
  title: string
  historyLink: { href: string; label: string }
  empty: { title: string; description: string }
  items: ListedExpense[]
  categories: Category[]
  listLabels: React.ComponentProps<typeof ExpenseList>["labels"]
}

/** Últimos movimientos, editables. Sin datos, muestra el estado vacío. */
export function RecentExpenses({
  title,
  historyLink,
  empty,
  items,
  categories,
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
        labels={listLabels}
      />
    </section>
  )
}

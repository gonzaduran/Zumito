import { BudgetsForm, type BudgetField } from "@/components/forms/budgets-form"
import { AppHeader } from "@/components/layout/app-header"
import { defaultTimeZone } from "@/i18n/config"
import { calendarDay, formatCents } from "@/i18n/format"
import { getDictionary } from "@/i18n/get-dictionary"
import { fromCents } from "@/lib/amount-input"
import { getCategories } from "@/lib/data/categories"
import { getBudgetStatus, getSpendingByCategory } from "@/lib/data/expenses"
import { getCurrentProfile } from "@/lib/data/profile"
import { monthRange } from "@/lib/periods"

export default async function BudgetsPage() {
  const [dict, profile, categories, status] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    getCategories(),
    getBudgetStatus(),
  ])
  const labels = dict.budgets
  const month = monthRange(
    calendarDay(new Date(), profile?.timezone ?? defaultTimeZone).slice(0, 7),
  )
  const spending = await getSpendingByCategory(month.from, month.to)

  const budgetFor = (categoryId: string | null) =>
    status.find((row) => row.category_id === categoryId)
  const field = (
    id: string,
    label: string,
    spentCents: number,
    budgetCents: number | undefined,
    extra: Pick<BudgetField, "emoji" | "color"> = {},
  ): BudgetField => ({
    id,
    label,
    ...extra,
    value: budgetCents ? fromCents(budgetCents) : "",
    spent: formatCents(spentCents),
    budget: budgetCents ? formatCents(budgetCents) : undefined,
    ratio: budgetCents ? spentCents / budgetCents : undefined,
  })

  const monthSpent = spending.reduce((sum, row) => sum + row.total_cents, 0)
  const total = field("total", labels.totalLabel, monthSpent, budgetFor(null)?.amount_cents)
  const categoryFields = categories.map((category) =>
    field(
      category.id,
      category.name,
      spending.find((row) => row.category_id === category.id)?.total_cents ?? 0,
      budgetFor(category.id)?.amount_cents,
      { emoji: category.emoji, color: category.color },
    ),
  )

  return (
    <>
      <AppHeader title={labels.title} back={{ href: "/ajustes", label: labels.back }} />
      <div className="flex flex-col gap-6 px-6 pt-2 pb-8">
        <p className="text-sm text-muted-foreground">{labels.intro}</p>
        <BudgetsForm labels={labels} total={total} categories={categoryFields} />
      </div>
    </>
  )
}

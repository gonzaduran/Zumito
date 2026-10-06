import { AppHeader } from "@/components/layout/app-header"
import { MoneyManager } from "@/components/money/money-manager"
import { defaultTimeZone } from "@/i18n/config"
import { calendarDay, formatCents, formatDate } from "@/i18n/format"
import { getDictionary } from "@/i18n/get-dictionary"
import { getIncomesAround, getRecurringIncomes, getSplitRecurringIds } from "@/lib/data/incomes"
import { getCurrentProfile, getEntitlement } from "@/lib/data/profile"
import { monthRange } from "@/lib/periods"

export default async function MoneyPage() {
  const [dict, profile, entitlement] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    getEntitlement(),
  ])
  const labels = dict.money
  const timeZone = profile?.timezone ?? defaultTimeZone
  const today = calendarDay(new Date(), timeZone)
  const month = monthRange(today.slice(0, 7))
  const [recurring, incomes, splitIds] = await Promise.all([
    getRecurringIncomes(),
    getIncomesAround(month.from, month.to),
    getSplitRecurringIds(),
  ])

  const monthIncomes = incomes.filter((income) => {
    const day = calendarDay(new Date(income.received_at), timeZone)
    return day >= month.from && day < month.to
  })

  return (
    <>
      <AppHeader title={labels.title} back={{ href: "/ajustes", label: labels.back }} />
      <div className="flex flex-col gap-6 px-6 pt-2 pb-8">
        <p className="text-sm text-muted-foreground">{labels.intro}</p>
        <MoneyManager
          labels={labels}
          validation={dict.validation}
          plans={dict.plans}
          today={today}
          canAddRecurring={entitlement.premium || recurring.length === 0}
          splitLabels={dict.split}
          splitIds={splitIds}
          canSplit={entitlement.premium}
          recurring={recurring.map((row) => ({
            id: row.id,
            description: row.description,
            amount: formatCents(row.amount_cents),
            day: row.day_of_month,
            active: row.active,
          }))}
          incomes={monthIncomes.map((row) => ({
            id: row.id,
            description: row.description,
            amount: formatCents(row.amount_cents),
            date: formatDate(new Date(row.received_at), { timeZone }),
            automatic: row.recurring_id !== null,
          }))}
        />
      </div>
    </>
  )
}

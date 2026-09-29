import { CategoryBreakdown } from "@/components/home/category-breakdown"
import { RecentExpenses } from "@/components/home/recent-expenses"
import { SpendingHeroCard } from "@/components/home/spending-hero-card"
import { AppHeader } from "@/components/layout/app-header"
import { ProfileButton } from "@/components/layout/profile-button"
import { defaultTimeZone } from "@/i18n/config"
import { calendarDay, formatCents, formatMonth } from "@/i18n/format"
import { getDictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { getCategories } from "@/lib/data/categories"
import { getExpenseSummary, getSpendingByCategory, searchExpenses } from "@/lib/data/expenses"
import { getCurrentProfile } from "@/lib/data/profile"
import { toRecentExpenses } from "@/lib/expense-view"
import { comparisonRange, monthRange, percentChange } from "@/lib/periods"
import { buildCategoryBreakdown, describeDelta } from "@/lib/stats-view"

const HOME_TOP_CATEGORIES = 5

export default async function HomePage() {
  const [dict, profile] = await Promise.all([getDictionary(), getCurrentProfile()])
  const name = profile?.display_name
  const timeZone = profile?.timezone ?? defaultTimeZone
  const now = new Date()
  const today = calendarDay(now, timeZone)
  const month = monthRange(today.slice(0, 7))
  const previous = comparisonRange(today.slice(0, 7), today)

  const [summary, recent, categories, byCategory, previousByCategory] = await Promise.all([
    getExpenseSummary(),
    searchExpenses({ limit: 5 }),
    getCategories(),
    getSpendingByCategory(month.from, month.to),
    getSpendingByCategory(previous.from, previous.to),
  ])

  const previousMonthCents = previousByCategory.reduce((acc, row) => acc + row.total_cents, 0)
  const monthDelta = describeDelta(
    percentChange(summary.monthCents, previousMonthCents),
    { more: dict.stats.deltaMore, less: dict.stats.deltaLess, same: dict.stats.deltaSame },
    dict.home.delta.previous,
  )
  const period = (cents: number) => ({ amount: formatCents(cents), delta: null })

  return (
    <>
      <AppHeader
        eyebrow={name ? interpolate(dict.common.greetingWithName, { name }) : dict.common.greeting}
        title={formatMonth(now, { timeZone })}
        action={<ProfileButton label={dict.common.profile} />}
      />
      <div className="flex flex-col gap-7 px-6 pt-4">
        <SpendingHeroCard
          labels={dict.home}
          summaries={{
            today: period(summary.todayCents),
            week: period(summary.weekCents),
            month: { amount: formatCents(summary.monthCents), delta: monthDelta },
            total: period(summary.totalCents),
          }}
        />
        <CategoryBreakdown
          title={dict.home.categoriesTitle}
          seeAll={{ href: "/estadisticas", label: dict.home.seeAll }}
          items={buildCategoryBreakdown(byCategory, {
            top: HOME_TOP_CATEGORIES,
            othersLabel: dict.stats.others,
            includeOthers: false,
          })}
        />
        <RecentExpenses
          title={dict.home.recentTitle}
          historyLink={{ href: "/historial", label: dict.home.historyLink }}
          empty={{ title: dict.home.emptyTitle, description: dict.home.emptyDescription }}
          items={toRecentExpenses(recent.rows, { labels: dict.common, timeZone, now })}
          categories={categories}
          listLabels={{
            form: dict.addExpense,
            edit: dict.editExpense,
            dayTotal: dict.history.dayTotal,
            close: dict.common.close,
          }}
        />
      </div>
    </>
  )
}

import { CategoryBreakdown } from "@/components/home/category-breakdown"
import { RecentExpenses } from "@/components/home/recent-expenses"
import { SpendingHeroCard } from "@/components/home/spending-hero-card"
import { AppHeader } from "@/components/layout/app-header"
import { ProfileButton } from "@/components/layout/profile-button"
import { formatCents, formatMonth } from "@/i18n/format"
import { getDictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { getCategories } from "@/lib/data/categories"
import { getExpenseSummary, searchExpenses } from "@/lib/data/expenses"
import { getCurrentProfile } from "@/lib/data/profile"
import { toRecentExpenses } from "@/lib/expense-view"

export default async function HomePage() {
  const [dict, profile, summary, recent, categories] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    getExpenseSummary(),
    searchExpenses({ limit: 5 }),
    getCategories(),
  ])
  const name = profile?.display_name
  const timeZone = profile?.timezone
  const now = new Date()

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
            month: period(summary.monthCents),
            total: period(summary.totalCents),
          }}
        />
        {/* El desglose por categoría llega con las estadísticas. */}
        <CategoryBreakdown
          title={dict.home.categoriesTitle}
          seeAll={{ href: "/estadisticas", label: dict.home.seeAll }}
          items={[]}
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

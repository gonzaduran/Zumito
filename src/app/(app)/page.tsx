import { BalanceCard } from "@/components/home/balance-card"
import { BudgetNotice } from "@/components/home/budget-notice"
import { CategoryBreakdown } from "@/components/home/category-breakdown"
import { RecentExpenses } from "@/components/home/recent-expenses"
import { SpendingHeroCard } from "@/components/home/spending-hero-card"
import { AppHeader } from "@/components/layout/app-header"
import { HomePremiumBar } from "@/components/plans/home-premium-bar"
import { ProfileButton } from "@/components/layout/profile-button"
import { defaultTimeZone } from "@/i18n/config"
import { calendarDay, formatCents, formatMonth } from "@/i18n/format"
import { getDictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { getBillingConfig } from "@/lib/billing/config"
import { PREMIUM_PRICES, WELCOME_YEAR_PRICE, welcomeOfferRemainingMs } from "@/lib/billing/plans"
import { getCategories } from "@/lib/data/categories"
import { getIncomeTotal, getRecurringIncomes } from "@/lib/data/incomes"
import {
  getBudgetStatus,
  getExpenseSummary,
  getPeople,
  getPlaces,
  getSpendingByCategory,
  searchExpenses,
} from "@/lib/data/expenses"
import { getCurrentProfile, getEntitlement } from "@/lib/data/profile"
import { pickBudgetNotice, totalBudgetRing } from "@/lib/budget-view"
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

  const [
    summary,
    recent,
    categories,
    byCategory,
    previousByCategory,
    allBudgets,
    places,
    people,
    entitlement,
    monthIncome,
    recurringIncomes,
  ] = await Promise.all([
    getExpenseSummary(),
    searchExpenses({ limit: 5 }),
    getCategories(),
    getSpendingByCategory(month.from, month.to),
    getSpendingByCategory(previous.from, previous.to),
    getBudgetStatus(),
    getPlaces(),
    getPeople(),
    getEntitlement(),
    getIncomeTotal(month.from, month.to),
    getRecurringIncomes(),
  ])
  // Sin Premium, los presupuestos por categoría quedan en pausa: solo cuenta el total.
  const budgets = entitlement.premium
    ? allBudgets
    : allBudgets.filter((row) => row.category_id === null)
  const budgetNotice = pickBudgetNotice(budgets, dict.budgets.notice)

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
          budget={totalBudgetRing(budgets, dict.home.budgetUsed)}
        />
        {monthIncome > 0 || recurringIncomes.length > 0 ? (
          <BalanceCard
            kind="balance"
            title={
              monthIncome >= summary.monthCents ? dict.home.balanceLeft : dict.home.balanceOver
            }
            amount={formatCents(Math.abs(monthIncome - summary.monthCents))}
            over={monthIncome < summary.monthCents}
            detail={interpolate(dict.home.balanceDetail, {
              income: formatCents(monthIncome),
              spent: formatCents(summary.monthCents),
            })}
            linkLabel={dict.home.balanceLink}
          />
        ) : (
          <BalanceCard
            kind="cta"
            title={dict.home.balanceCtaTitle}
            text={dict.home.balanceCtaText}
            cta={dict.home.balanceCta}
          />
        )}
        {budgetNotice ? (
          <BudgetNotice tone={budgetNotice.tone} message={budgetNotice.message} />
        ) : null}
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
          places={places}
          people={people}
          listLabels={{
            form: dict.addExpense,
            edit: dict.editExpense,
            dayTotal: dict.history.dayTotal,
            close: dict.common.close,
          }}
        />
      </div>
      {/* Sin Premium, la oferta o la prueba gratis siempre a mano. */}
      {!entitlement.premium && getBillingConfig() ? (
        <HomePremiumBar
          labels={dict.plans.bar}
          label={dict.plans.premium.name}
          offerRemainingMs={welcomeOfferRemainingMs(profile?.welcome_offer_started_at ?? null)}
          trialAvailable={entitlement.trialAvailable}
          welcomePrice={formatCents(WELCOME_YEAR_PRICE)}
          monthPrice={formatCents(PREMIUM_PRICES.month)}
        />
      ) : null}
    </>
  )
}

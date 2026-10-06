import { CommunityCard } from "@/components/community/community-card"
import { AccountsCard } from "@/components/home/accounts-card"
import { SplitCard } from "@/components/home/split-card"
import { BalanceCard } from "@/components/home/balance-card"
import { FriendsCard } from "@/components/home/friends-card"
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
import { avatarUrl, personName } from "@/lib/avatar"
import { getMyFriends } from "@/lib/data/social"
import { getCategories } from "@/lib/data/categories"
import { getAccountSummary } from "@/lib/data/accounts"
import {
  getIncomeTotal,
  getRecurringIncomes,
  getSplitRecurringIds,
  getSplitStatus,
} from "@/lib/data/incomes"
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
    accountSummary,
    splitIds,
    friendships,
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
    getAccountSummary(month.from, month.to),
    getSplitRecurringIds(),
    getMyFriends(),
  ])
  // Solo los amigos con saldo pendiente, los mayores primero.
  const pendingBalances = friendships
    .filter((friend) => friend.relation === "friend" && friend.balance_cents !== 0)
    .sort((a, b) => Math.abs(b.balance_cents) - Math.abs(a.balance_cents))
    .slice(0, 3)
  // Reparto de la nómina: el del primer ingreso programado que lo tenga.
  const splitIncome = recurringIncomes.find((row) => splitIds.includes(row.id))
  const splitBuckets = splitIncome ? await getSplitStatus(splitIncome.id, month.from, month.to) : []
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
        action={
          <ProfileButton
            label={dict.common.profile}
            avatarUrl={avatarUrl(profile?.avatar_path)}
            name={profile?.display_name ?? profile?.username}
          />
        }
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
        {accountSummary.length > 1 ? (
          <AccountsCard
            title={dict.home.accountsTitle}
            items={accountSummary.map((account) => {
              const left = account.income_cents - account.spent_cents
              return {
                id: account.id,
                name: account.name,
                emoji: account.emoji,
                spent: interpolate(dict.home.accountSpent, {
                  amount: formatCents(account.spent_cents),
                }),
                balance:
                  account.income_cents > 0
                    ? {
                        text: interpolate(
                          left >= 0 ? dict.home.accountLeft : dict.home.accountOver,
                          {
                            amount: formatCents(Math.abs(left)),
                          },
                        ),
                        over: left < 0,
                      }
                    : null,
              }
            })}
          />
        ) : null}
        {pendingBalances.length > 0 ? (
          <FriendsCard
            title={dict.friends.homeTitle}
            seeAll={{ href: "/amigos", label: dict.friends.homeSeeAll }}
            items={pendingBalances.map((friend) => ({
              id: friend.id,
              name: personName(friend),
              avatarUrl: avatarUrl(friend.avatar_path),
              owesMe: friend.balance_cents > 0,
              balance:
                friend.balance_cents > 0
                  ? interpolate(dict.friends.owesYou, { amount: formatCents(friend.balance_cents) })
                  : interpolate(dict.friends.youOwe, {
                      amount: formatCents(-friend.balance_cents),
                    }),
            }))}
          />
        ) : null}
        {splitIncome && splitBuckets.length > 0 ? (
          <SplitCard
            title={interpolate(dict.split.homeTitle, {
              name: splitIncome.description.toLowerCase(),
            })}
            editLabel={dict.split.homeEdit}
            editHref={`/ajustes/dinero/reparto/${splitIncome.id}`}
            items={splitBuckets.map((bucket) => {
              const tracked = bucket.category_ids.length > 0
              const over = bucket.spent_cents - bucket.target_cents
              return {
                id: bucket.id,
                name: bucket.name,
                emoji: bucket.emoji,
                ratio:
                  tracked && bucket.target_cents > 0
                    ? bucket.spent_cents / bucket.target_cents
                    : tracked
                      ? 1
                      : null,
                status: !tracked
                  ? interpolate(dict.split.homeSave, { amount: formatCents(bucket.target_cents) })
                  : over > 0
                    ? interpolate(dict.split.homeOver, { amount: formatCents(over) })
                    : interpolate(dict.split.homeSpent, {
                        spent: formatCents(bucket.spent_cents),
                        target: formatCents(bucket.target_cents),
                      }),
              }
            })}
          />
        ) : null}
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
        <CommunityCard
          labels={dict.community}
          share={dict.plans.beta}
          beta={entitlement.source === "beta"}
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

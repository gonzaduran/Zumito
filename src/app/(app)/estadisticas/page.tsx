import { ChartPie } from "lucide-react"

import { MonthlyTrendChart } from "@/components/charts/monthly-trend-chart"
import { CategoryBreakdown } from "@/components/home/category-breakdown"
import { SectionHeader } from "@/components/home/section-header"
import { AppHeader } from "@/components/layout/app-header"
import { DeltaLine } from "@/components/stats/delta-line"
import { MonthSwitcher } from "@/components/stats/month-switcher"
import { EmptyState } from "@/components/ui/empty-state"
import { defaultTimeZone } from "@/i18n/config"
import { calendarDay, formatCents, formatMonthName } from "@/i18n/format"
import { getDictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { getSpendingByCategory, getSpendingByMonth } from "@/lib/data/expenses"
import { getCurrentProfile } from "@/lib/data/profile"
import { addMonths, comparisonRange, monthRange, percentChange, resolveMonth } from "@/lib/periods"
import { buildCategoryBreakdown, describeDelta } from "@/lib/stats-view"
import { CHART_TOP_CATEGORIES } from "@/lib/utils/group-top-categories"

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)
const sum = (rows: { total_cents: number }[]) => rows.reduce((acc, row) => acc + row.total_cents, 0)

export default async function StatsPage({ searchParams }: PageProps<"/estadisticas">) {
  const [params, dict, profile] = await Promise.all([
    searchParams,
    getDictionary(),
    getCurrentProfile(),
  ])
  const labels = dict.stats
  const today = calendarDay(new Date(), profile?.timezone ?? defaultTimeZone)
  const currentMonth = today.slice(0, 7)
  const month = resolveMonth(single(params.m), currentMonth)
  const range = monthRange(month)
  const compare = comparisonRange(month, today)

  const [byCategory, previousByCategory, byMonth] = await Promise.all([
    getSpendingByCategory(range.from, range.to),
    getSpendingByCategory(compare.from, compare.to),
    getSpendingByMonth(6),
  ])

  const total = sum(byCategory)
  const previousMonth = addMonths(month, -1)
  const previousName = formatMonthName(previousMonth, {
    withYear: previousMonth.slice(0, 4) !== month.slice(0, 4),
  })
  const delta = describeDelta(
    percentChange(total, sum(previousByCategory)),
    { more: labels.deltaMore, less: labels.deltaLess, same: labels.deltaSame },
    interpolate(month === currentMonth ? labels.periodSoFar : labels.periodFull, {
      month: previousName,
    }),
  )
  const monthName = formatMonthName(month, { withYear: false })
  const breakdown = buildCategoryBreakdown(byCategory, {
    top: CHART_TOP_CATEGORIES,
    othersLabel: labels.others,
  })
  const points = byMonth.map((row) => {
    const key = row.month.slice(0, 7)
    return {
      month: key,
      short: formatMonthName(key, { style: "short" }),
      label: formatMonthName(key),
      cents: row.total_cents,
      amount: formatCents(row.total_cents),
    }
  })
  const hasHistory = points.some((point) => point.cents > 0)

  return (
    <>
      <AppHeader title={labels.title} />
      <div className="flex flex-col gap-7 px-6 pt-4">
        <MonthSwitcher
          navLabel={labels.monthNav}
          label={formatMonthName(month)}
          previous={{ href: `/estadisticas?m=${previousMonth}`, label: labels.previousMonth }}
          next={
            month < currentMonth
              ? { href: `/estadisticas?m=${addMonths(month, 1)}`, label: labels.nextMonth }
              : null
          }
        />

        {total > 0 ? (
          <>
            <div>
              <p className="text-[13px] font-semibold text-muted-foreground">
                {interpolate(labels.spentIn, { month: monthName })}
              </p>
              <p className="num text-[44px] leading-tight font-extrabold tracking-[-0.01em]">
                {formatCents(total)}
              </p>
              {delta ? <DeltaLine delta={delta} className="mt-1" /> : null}
            </div>
            <CategoryBreakdown title={labels.byCategory} items={breakdown} />
          </>
        ) : (
          <EmptyState
            icon={ChartPie}
            title={interpolate(labels.emptyTitle, { month: monthName })}
            description={labels.emptyDescription}
          />
        )}

        {hasHistory ? (
          <section>
            <SectionHeader title={labels.trendTitle} />
            <MonthlyTrendChart
              points={points}
              selectedMonth={month}
              labels={{
                title: labels.trendTitle,
                month: labels.monthColumn,
                amount: labels.amountColumn,
              }}
            />
          </section>
        ) : null}
      </div>
    </>
  )
}

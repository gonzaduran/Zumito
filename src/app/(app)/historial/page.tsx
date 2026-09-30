import { ListOrdered, SearchX } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"
import { z } from "zod"

import { ExpenseList } from "@/components/expenses/expense-list"
import { HistoryFilters } from "@/components/history/history-filters"
import { AppHeader } from "@/components/layout/app-header"
import { buttonVariants } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { formatCents } from "@/i18n/format"
import { getDictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { parseEuros } from "@/lib/amount-input"
import { getCategories } from "@/lib/data/categories"
import { getPeople, getPlaces, searchExpenses } from "@/lib/data/expenses"
import { getCurrentProfile } from "@/lib/data/profile"
import { groupExpensesByDay } from "@/lib/expense-view"
import { MAX_AMOUNT_CENTS } from "@/lib/validators/money"

const PAGE_SIZE = 50
const MAX_PAGES = 10

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)
const uuidOrEmpty = (value: string | undefined) => (z.uuid().safeParse(value).success ? value : "")

/** Importe de la URL en céntimos, o `undefined` si no es válido. */
function centsParam(value: string | undefined): number | undefined {
  if (!value) return undefined
  const cents = parseEuros(value.slice(0, 20))
  return cents !== null && Number.isInteger(cents) && cents >= 0 && cents <= MAX_AMOUNT_CENTS
    ? cents
    : undefined
}

export default async function HistoryPage({ searchParams }: PageProps<"/historial">) {
  const params = await searchParams
  const query = single(params.q)?.trim().slice(0, 80) ?? ""
  const categoryId = uuidOrEmpty(single(params.c))
  const placeId = uuidOrEmpty(single(params.l))
  const personId = uuidOrEmpty(single(params.p))
  const minCents = centsParam(single(params.min))
  const maxCents = centsParam(single(params.max))
  const pages = Math.min(Math.max(Number(single(params.n)) || 1, 1), MAX_PAGES)

  const [dict, profile, categories, places, people, result] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    getCategories(),
    getPlaces(),
    getPeople(),
    searchExpenses({
      query,
      categoryId,
      placeId,
      personId,
      minCents,
      maxCents,
      limit: PAGE_SIZE * pages,
    }),
  ])
  const labels = dict.history
  const filtered = Boolean(
    query || categoryId || placeId || personId || minCents !== undefined || maxCents !== undefined,
  )
  const groups = groupExpensesByDay(result.rows, {
    labels: dict.common,
    timeZone: profile?.timezone,
  })

  const amountLabel =
    minCents !== undefined && maxCents !== undefined
      ? interpolate(labels.amountBetween, {
          min: formatCents(minCents),
          max: formatCents(maxCents),
        })
      : minCents !== undefined
        ? interpolate(labels.amountAtLeast, { min: formatCents(minCents) })
        : maxCents !== undefined
          ? interpolate(labels.amountAtMost, { max: formatCents(maxCents) })
          : null

  const moreParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    const first = single(value)
    if (first && key !== "n") moreParams.set(key, first)
  }
  moreParams.set("n", String(pages + 1))

  return (
    <>
      <AppHeader title={labels.title} />
      <div className="flex flex-1 flex-col gap-4 px-6 pt-4">
        {/* useSearchParams necesita un límite de Suspense. */}
        <Suspense>
          <HistoryFilters
            labels={labels}
            closeLabel={dict.common.close}
            categories={categories}
            places={places}
            people={people}
            amountLabel={amountLabel}
          />
        </Suspense>

        {groups.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={SearchX}
              title={labels.noResultsTitle}
              description={labels.noResultsDescription}
              action={
                <Link href="/historial" className={buttonVariants({ variant: "outline" })}>
                  {labels.clearFilters}
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={ListOrdered}
              title={labels.emptyTitle}
              description={labels.emptyDescription}
            />
          )
        ) : (
          <div className="flex flex-col gap-2">
            <ExpenseList
              groups={groups}
              categories={categories}
              places={places}
              people={people}
              labels={{
                form: dict.addExpense,
                edit: dict.editExpense,
                dayTotal: labels.dayTotal,
                close: dict.common.close,
              }}
            />
            {result.hasMore && pages < MAX_PAGES ? (
              <Link
                href={`/historial?${moreParams}`}
                scroll={false}
                className={buttonVariants({ variant: "secondary", className: "my-4 self-center" })}
              >
                {labels.loadMore}
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </>
  )
}

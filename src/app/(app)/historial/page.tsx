import { ListOrdered, SearchX } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

import { ExpenseList } from "@/components/expenses/expense-list"
import { HistoryFilters } from "@/components/history/history-filters"
import { AppHeader } from "@/components/layout/app-header"
import { buttonVariants } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { getDictionary } from "@/i18n/get-dictionary"
import { getCategories } from "@/lib/data/categories"
import { searchExpenses } from "@/lib/data/expenses"
import { getCurrentProfile } from "@/lib/data/profile"
import { groupExpensesByDay } from "@/lib/expense-view"

const PAGE_SIZE = 50
const MAX_PAGES = 10

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default async function HistoryPage({ searchParams }: PageProps<"/historial">) {
  const params = await searchParams
  const query = single(params.q)?.trim().slice(0, 80) ?? ""
  const categoryId = single(params.c) ?? ""
  const pages = Math.min(Math.max(Number(single(params.n)) || 1, 1), MAX_PAGES)

  const [dict, profile, categories, result] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    getCategories(),
    searchExpenses({ query, categoryId, limit: PAGE_SIZE * pages }),
  ])
  const labels = dict.history
  const filtered = Boolean(query || categoryId)
  const groups = groupExpensesByDay(result.rows, {
    labels: dict.common,
    timeZone: profile?.timezone,
  })

  const moreParams = new URLSearchParams()
  if (query) moreParams.set("q", query)
  if (categoryId) moreParams.set("c", categoryId)
  moreParams.set("n", String(pages + 1))

  return (
    <>
      <AppHeader title={labels.title} />
      <div className="flex flex-1 flex-col gap-4 px-6 pt-4">
        {/* useSearchParams necesita un límite de Suspense. */}
        <Suspense>
          <HistoryFilters labels={labels} categories={categories} />
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

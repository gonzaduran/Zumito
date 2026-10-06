import { notFound } from "next/navigation"
import { z } from "zod"

import { AppHeader } from "@/components/layout/app-header"
import { SplitEditor } from "@/components/money/split-editor"
import { defaultTimeZone } from "@/i18n/config"
import { calendarDay, formatCents } from "@/i18n/format"
import { getDictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { getCategories } from "@/lib/data/categories"
import { getRecurringIncomes, getSplitStatus } from "@/lib/data/incomes"
import { getCurrentProfile } from "@/lib/data/profile"
import { monthRange } from "@/lib/periods"

export default async function SplitPage({ params }: PageProps<"/ajustes/dinero/reparto/[id]">) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()

  const [dict, profile, recurring, categories] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    getRecurringIncomes(),
    getCategories(),
  ])
  const income = recurring.find((row) => row.id === id)
  if (!income) notFound()

  const labels = dict.split
  const month = monthRange(
    calendarDay(new Date(), profile?.timezone ?? defaultTimeZone).slice(0, 7),
  )
  const buckets = await getSplitStatus(id, month.from, month.to)

  return (
    <>
      <AppHeader title={labels.title} back={{ href: "/ajustes/dinero", label: labels.back }} />
      <div className="flex flex-col gap-6 px-6 pt-2 pb-8">
        <p className="text-sm text-muted-foreground">
          {interpolate(labels.intro, {
            name: income.description.toLowerCase(),
            amount: formatCents(income.amount_cents),
          })}
        </p>
        <SplitEditor
          labels={labels}
          validation={dict.validation}
          recurringId={id}
          amountCents={income.amount_cents}
          categories={categories}
          initial={buckets.map((bucket) => ({
            key: bucket.id,
            name: bucket.name,
            emoji: bucket.emoji,
            percent: String(bucket.percent),
            categoryIds: bucket.category_ids,
          }))}
        />
      </div>
    </>
  )
}

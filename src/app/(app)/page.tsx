import { Receipt } from "lucide-react"
import { connection } from "next/server"

import { PeriodSummary } from "@/components/layout/period-summary"
import { AppHeader } from "@/components/layout/app-header"
import { EmptyState } from "@/components/ui/empty-state"
import { formatCurrency, formatMonth } from "@/i18n/format"
import { getDictionary } from "@/i18n/get-dictionary"

export default async function HomePage() {
  await connection()
  const dict = await getDictionary()

  return (
    <>
      <AppHeader eyebrow={dict.common.greeting} title={formatMonth(new Date())} />
      <div className="flex flex-col gap-7 px-6 pt-5">
        <PeriodSummary
          label={dict.home.periodsLabel}
          periods={dict.home.periods}
          amount={formatCurrency(0)}
        />
        <EmptyState
          icon={Receipt}
          title={dict.home.emptyTitle}
          description={dict.home.emptyDescription}
        />
      </div>
    </>
  )
}

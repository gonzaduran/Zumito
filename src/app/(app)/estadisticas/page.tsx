import { ChartPie } from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { EmptyState } from "@/components/ui/empty-state"
import { getDictionary } from "@/i18n/get-dictionary"

export default async function StatsPage() {
  const dict = await getDictionary()

  return (
    <>
      <AppHeader title={dict.stats.title} />
      <EmptyState
        className="flex-1"
        icon={ChartPie}
        title={dict.stats.emptyTitle}
        description={dict.stats.emptyDescription}
      />
    </>
  )
}

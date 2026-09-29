import { ListOrdered } from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { EmptyState } from "@/components/ui/empty-state"
import { getDictionary } from "@/i18n/get-dictionary"

export default async function HistoryPage() {
  const dict = await getDictionary()

  return (
    <>
      <AppHeader title={dict.history.title} />
      <EmptyState
        className="flex-1"
        icon={ListOrdered}
        title={dict.history.emptyTitle}
        description={dict.history.emptyDescription}
      />
    </>
  )
}

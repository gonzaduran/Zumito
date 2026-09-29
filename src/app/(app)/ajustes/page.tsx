import { Settings } from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { EmptyState } from "@/components/ui/empty-state"
import { getDictionary } from "@/i18n/get-dictionary"

export default async function SettingsPage() {
  const dict = await getDictionary()

  return (
    <>
      <AppHeader title={dict.settings.title} />
      <EmptyState
        className="flex-1"
        icon={Settings}
        title={dict.settings.emptyTitle}
        description={dict.settings.emptyDescription}
      />
    </>
  )
}

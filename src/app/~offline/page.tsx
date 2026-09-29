import { WifiOff } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { getDictionary } from "@/i18n/get-dictionary"

/** Se muestra si no hay conexión y la página pedida no estaba guardada. */
export default async function OfflinePage() {
  const dict = await getDictionary()
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <EmptyState
        icon={WifiOff}
        title={dict.offline.title}
        description={dict.offline.description}
      />
    </main>
  )
}

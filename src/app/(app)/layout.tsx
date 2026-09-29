import { redirect } from "next/navigation"

import { BottomNav } from "@/components/layout/bottom-nav"
import { OfflineSync } from "@/components/layout/offline-sync"
import { getDictionary } from "@/i18n/get-dictionary"
import { getCategories } from "@/lib/data/categories"
import { getLastUsedCategoryId } from "@/lib/data/expenses"
import { getCurrentProfile } from "@/lib/data/profile"

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [dict, profile] = await Promise.all([getDictionary(), getCurrentProfile()])

  if (!profile) redirect("/login")
  if (!profile.onboarded_at) redirect("/onboarding")

  const [categories, lastUsedCategoryId] = await Promise.all([
    getCategories(),
    getLastUsedCategoryId(),
  ])

  return (
    <>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col pb-[calc(var(--nav-height)+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <BottomNav
        labels={dict.nav}
        closeLabel={dict.common.close}
        addExpense={dict.addExpense}
        offline={dict.offline}
        categories={categories}
        lastUsedCategoryId={lastUsedCategoryId}
      />
      <OfflineSync syncedLabel={dict.offline.synced} />
    </>
  )
}

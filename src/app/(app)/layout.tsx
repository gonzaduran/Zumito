import { redirect } from "next/navigation"

import { BottomNav } from "@/components/layout/bottom-nav"
import { getDictionary } from "@/i18n/get-dictionary"
import { getCurrentProfile } from "@/lib/data/profile"

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [dict, profile] = await Promise.all([getDictionary(), getCurrentProfile()])

  if (!profile) redirect("/login")
  if (!profile.onboarded_at) redirect("/onboarding")

  return (
    <>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col pb-[calc(var(--nav-height)+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <BottomNav labels={dict.nav} closeLabel={dict.common.close} addExpense={dict.addExpense} />
    </>
  )
}

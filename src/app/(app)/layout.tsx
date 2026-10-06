import { redirect } from "next/navigation"

import { AccountsProvider } from "@/components/accounts/accounts-provider"
import { BottomNav } from "@/components/layout/bottom-nav"
import { OfflineSync } from "@/components/layout/offline-sync"
import { SocialProvider } from "@/components/social/social-provider"
import { getDictionary } from "@/i18n/get-dictionary"
import { getAccounts, getLastUsedAccountId } from "@/lib/data/accounts"
import { getCategories } from "@/lib/data/categories"
import { getLastUsedCategoryId, getPeople, getPlaces } from "@/lib/data/expenses"
import { avatarUrl, personName } from "@/lib/avatar"
import { getCurrentProfile, getCurrentUser } from "@/lib/data/profile"
import { getMyFriends } from "@/lib/data/social"

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [dict, profile] = await Promise.all([getDictionary(), getCurrentProfile()])

  if (!profile) redirect("/login")
  if (!profile.onboarded_at) redirect("/onboarding")

  const [
    categories,
    lastUsedCategoryId,
    places,
    people,
    accounts,
    lastUsedAccountId,
    user,
    friendships,
  ] = await Promise.all([
    getCategories(),
    getLastUsedCategoryId(),
    getPlaces(),
    getPeople(),
    getAccounts(),
    getLastUsedAccountId(),
    getCurrentUser(),
    getMyFriends(),
  ])
  const friends = friendships
    .filter((friend) => friend.relation === "friend")
    .map((friend) => ({
      id: friend.id,
      name: personName(friend),
      avatarUrl: avatarUrl(friend.avatar_path),
    }))
  const me = user ? { id: user.sub, name: personName(profile) } : null

  return (
    <AccountsProvider accounts={accounts} lastUsedAccountId={lastUsedAccountId}>
      <SocialProvider me={me} friends={friends}>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col pb-[calc(var(--nav-height)+env(safe-area-inset-bottom))]">
          {children}
        </div>
        <BottomNav
          labels={dict.nav}
          closeLabel={dict.common.close}
          addExpense={dict.addExpense}
          offline={dict.offline}
          categories={categories}
          places={places}
          people={people}
          lastUsedCategoryId={lastUsedCategoryId}
        />
        <OfflineSync syncedLabel={dict.offline.synced} />
      </SocialProvider>
    </AccountsProvider>
  )
}

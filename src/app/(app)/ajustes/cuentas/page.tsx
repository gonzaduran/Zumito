import { AppHeader } from "@/components/layout/app-header"
import { AccountManager } from "@/components/settings/account-manager"
import { getDictionary } from "@/i18n/get-dictionary"
import { ACCOUNT_LIMITS } from "@/lib/billing/plans"
import { getAllAccounts } from "@/lib/data/accounts"
import { getEntitlement } from "@/lib/data/profile"

export default async function AccountsPage() {
  const [dict, accounts, entitlement] = await Promise.all([
    getDictionary(),
    getAllAccounts(),
    getEntitlement(),
  ])
  const labels = dict.accounts
  const activeCount = accounts.filter((account) => !account.archived).length
  const limit = entitlement.premium ? ACCOUNT_LIMITS.premium : ACCOUNT_LIMITS.free

  return (
    <>
      <AppHeader title={labels.title} back={{ href: "/ajustes", label: labels.back }} />
      <div className="flex flex-col gap-6 px-6 pt-2 pb-8">
        <p className="text-sm text-muted-foreground">{labels.intro}</p>
        <AccountManager
          labels={labels}
          emojiLabels={dict.emojiPicker}
          validation={dict.validation}
          accounts={accounts}
          canAdd={activeCount < limit}
        />
      </div>
    </>
  )
}

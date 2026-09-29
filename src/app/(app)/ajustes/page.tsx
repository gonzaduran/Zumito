import { LogOut } from "lucide-react"

import { Logo } from "@/components/brand/logo"
import { AppHeader } from "@/components/layout/app-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getDictionary } from "@/i18n/get-dictionary"
import { getCurrentUser } from "@/lib/data/profile"

import { signOut } from "./actions"

export default async function SettingsPage() {
  const [dict, user] = await Promise.all([getDictionary(), getCurrentUser()])

  return (
    <>
      <AppHeader title={dict.settings.title} />
      <div className="flex flex-col gap-6 px-6 pt-4">
        <div className="flex items-center gap-4">
          <Logo size={56} className="text-foreground" />
          <div>
            <p className="text-lg font-extrabold">{dict.app.name}</p>
            <p className="text-sm text-muted-foreground">{dict.app.description}</p>
          </div>
        </div>

        <section aria-labelledby="account-title">
          <h2 id="account-title" className="mb-2 text-[15px] font-extrabold">
            {dict.settings.account}
          </h2>
          <Card className="flex flex-col gap-4">
            <div className="min-w-0">
              <p className="text-[13px] text-muted-foreground">{dict.settings.signedInAs}</p>
              <p className="truncate font-bold">{user?.email}</p>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="secondary" className="w-full">
                <LogOut />
                {dict.settings.signOut}
              </Button>
            </form>
          </Card>
        </section>

        <p className="text-sm text-muted-foreground">{dict.settings.comingSoon}</p>
      </div>
    </>
  )
}

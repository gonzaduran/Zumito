import {
  CircleHelp,
  CreditCard,
  Crown,
  Download,
  MessageSquareHeart,
  PiggyBank,
  Tags,
  Users,
  Wallet,
} from "lucide-react"

import { Logo } from "@/components/brand/logo"
import { CommunityCard } from "@/components/community/community-card"
import { AppHeader } from "@/components/layout/app-header"
import { InstallAppCard } from "@/components/layout/install-app-card"
import { DeleteAccount } from "@/components/settings/delete-account"
import { ProfileNameForm } from "@/components/settings/profile-name-form"
import { AvatarUpload } from "@/components/social/avatar-upload"
import { UsernameForm } from "@/components/social/username-form"
import { SettingsLink } from "@/components/settings/settings-link"
import { SignOutButton } from "@/components/settings/sign-out-button"
import { Card } from "@/components/ui/card"
import { getDictionary } from "@/i18n/get-dictionary"
import { avatarUrl, personName } from "@/lib/avatar"
import { getCurrentProfile, getCurrentUser, getEntitlement } from "@/lib/data/profile"

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-2 text-[15px] font-extrabold">
        {title}
      </h2>
      {children}
    </section>
  )
}

export default async function SettingsPage() {
  const [dict, user, profile, entitlement] = await Promise.all([
    getDictionary(),
    getCurrentUser(),
    getCurrentProfile(),
    getEntitlement(),
  ])
  const labels = dict.settings
  const planHint =
    entitlement.source === "founder"
      ? labels.planFounder
      : entitlement.source === "beta"
        ? labels.planBeta
        : entitlement.premium
          ? labels.planPremium
          : labels.planFree

  return (
    <>
      <AppHeader title={labels.title} />
      <div className="flex flex-col gap-7 px-6 pt-4 pb-8">
        <div className="flex items-center gap-4">
          <Logo size={56} className="text-foreground" />
          <div>
            <p className="flex items-center gap-2 text-lg font-extrabold">
              {dict.app.name}
              {entitlement.source === "beta" ? (
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-extrabold text-primary-foreground">
                  {labels.betaBadge}
                </span>
              ) : null}
            </p>
            <p className="text-sm text-muted-foreground">{dict.app.description}</p>
          </div>
        </div>

        <CommunityCard
          labels={dict.community}
          share={dict.plans.beta}
          beta={entitlement.source === "beta"}
        />

        <InstallAppCard labels={dict.install} />

        <Card className="p-0">
          <SettingsLink
            href="/ajustes/ayuda"
            icon={CircleHelp}
            title={labels.help}
            hint={labels.helpHint}
          />
          <SettingsLink
            href="/ajustes/sugerencias"
            icon={MessageSquareHeart}
            title={labels.feedback}
            hint={labels.feedbackHint}
          />
          <SettingsLink
            href="/amigos"
            icon={Users}
            title={labels.friends}
            hint={labels.friendsHint}
          />
          <SettingsLink href="/planes" icon={Crown} title={labels.plan} hint={planHint} />
          <SettingsLink
            href="/ajustes/dinero"
            icon={Wallet}
            title={labels.money}
            hint={labels.moneyHint}
          />
          <SettingsLink
            href="/ajustes/cuentas"
            icon={CreditCard}
            title={labels.accounts}
            hint={labels.accountsHint}
          />
          <SettingsLink
            href="/ajustes/categorias"
            icon={Tags}
            title={labels.categories}
            hint={labels.categoriesHint}
          />
          <SettingsLink
            href="/ajustes/presupuestos"
            icon={PiggyBank}
            title={labels.budgets}
            hint={labels.budgetsHint}
          />
        </Card>

        <Section id="profile-title" title={labels.profile}>
          <Card className="flex flex-col gap-5">
            {user && profile ? (
              <AvatarUpload
                labels={labels}
                userId={user.sub}
                name={personName(profile)}
                currentPath={profile.avatar_path}
                currentUrl={avatarUrl(profile.avatar_path)}
              />
            ) : null}
            <ProfileNameForm labels={labels} initialName={profile?.display_name ?? ""} />
            <UsernameForm
              labels={labels}
              invalidLabel={dict.validation.usernameInvalid}
              initial={profile?.username ?? null}
            />
          </Card>
        </Section>

        <Section id="data-title" title={labels.data}>
          <Card className="p-0">
            <SettingsLink
              href="/ajustes/exportar"
              icon={Download}
              title={labels.export}
              hint={labels.exportHint}
              download
            />
          </Card>
        </Section>

        <Section id="account-title" title={labels.account}>
          <Card className="flex flex-col gap-4">
            <div className="min-w-0">
              <p className="text-[13px] text-muted-foreground">{labels.signedInAs}</p>
              <p className="truncate font-bold">{user?.email}</p>
            </div>
            <SignOutButton label={labels.signOut} />
          </Card>
        </Section>

        <Section id="danger-title" title={labels.dangerZone}>
          <DeleteAccount labels={labels} closeLabel={dict.common.close} />
        </Section>
      </div>
    </>
  )
}

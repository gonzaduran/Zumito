import { AppHeader } from "@/components/layout/app-header"
import { FriendsManager } from "@/components/social/friends-manager"
import { UsernameForm } from "@/components/social/username-form"
import { Card } from "@/components/ui/card"
import { formatCents } from "@/i18n/format"
import { getDictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { avatarUrl, personName } from "@/lib/avatar"
import { getPublicEnv } from "@/lib/env"
import { getCurrentProfile } from "@/lib/data/profile"
import { getMyFriends } from "@/lib/data/social"

export default async function FriendsPage({ searchParams }: PageProps<"/amigos">) {
  const [dict, profile, friends, params] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    getMyFriends(),
    searchParams,
  ])
  const labels = dict.friends
  const invitedBy = typeof params.u === "string" ? params.u.slice(0, 21) : ""

  return (
    <>
      <AppHeader title={labels.title} back={{ href: "/ajustes", label: labels.back }} />
      <div className="flex flex-col gap-6 px-6 pt-2 pb-8">
        <p className="text-sm text-muted-foreground">{labels.intro}</p>
        {!profile?.username ? (
          <Card className="flex flex-col gap-3">
            <p className="text-sm font-semibold">{labels.needUsername}</p>
            <UsernameForm
              labels={dict.settings}
              invalidLabel={dict.validation.usernameInvalid}
              initial={null}
            />
          </Card>
        ) : null}
        <FriendsManager
          labels={labels}
          share={dict.plans.beta}
          initialQuery={invitedBy}
          avatarBase={`${getPublicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars`}
          inviteText={
            profile?.username
              ? interpolate(labels.inviteText, { username: profile.username })
              : labels.inviteTextNoUser
          }
          friends={friends.map((friend) => ({
            id: friend.id,
            name: personName(friend),
            username: friend.username,
            avatarUrl: avatarUrl(friend.avatar_path),
            relation: friend.relation,
            owes: friend.balance_cents > 0 ? "them" : friend.balance_cents < 0 ? "me" : "none",
            balance:
              friend.balance_cents > 0
                ? interpolate(labels.owesYou, { amount: formatCents(friend.balance_cents) })
                : friend.balance_cents < 0
                  ? interpolate(labels.youOwe, { amount: formatCents(-friend.balance_cents) })
                  : labels.settled,
          }))}
        />
      </div>
    </>
  )
}

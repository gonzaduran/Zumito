import { cn } from "cn"
import { notFound } from "next/navigation"
import { z } from "zod"

import { AppHeader } from "@/components/layout/app-header"
import { Avatar } from "@/components/social/avatar"
import {
  DeleteSharedButton,
  RemoveFriendButton,
  SettleButton,
} from "@/components/social/friend-actions"
import { Card } from "@/components/ui/card"
import { defaultTimeZone } from "@/i18n/config"
import { formatCents, formatDate } from "@/i18n/format"
import { getDictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { avatarUrl, personName } from "@/lib/avatar"
import { getCurrentProfile, getCurrentUser } from "@/lib/data/profile"
import { getMyFriends, getSharedWithFriend } from "@/lib/data/social"

export default async function FriendPage({ params }: PageProps<"/amigos/[id]">) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()

  const [dict, user, profile, friends] = await Promise.all([
    getDictionary(),
    getCurrentUser(),
    getCurrentProfile(),
    getMyFriends(),
  ])
  const friend = friends.find((row) => row.id === id && row.relation === "friend")
  if (!friend || !user) notFound()

  const labels = dict.friends
  const shared = await getSharedWithFriend(id)
  const name = personName(friend)
  const timeZone = profile?.timezone ?? defaultTimeZone
  const balance = friend.balance_cents

  return (
    <>
      <AppHeader title={name} back={{ href: "/amigos", label: labels.detailBack }} />
      <div className="flex flex-col gap-6 px-6 pt-2 pb-8">
        <Card className="flex flex-col items-center gap-3 py-6 text-center">
          <Avatar url={avatarUrl(friend.avatar_path)} name={name} size={72} />
          {friend.username ? (
            <p className="text-sm text-muted-foreground">@{friend.username}</p>
          ) : null}
          <p
            className={cn(
              "num text-[26px] leading-tight font-extrabold",
              balance < 0 && "text-destructive-text",
            )}
          >
            {balance > 0
              ? interpolate(labels.owesYou, { amount: formatCents(balance) })
              : balance < 0
                ? interpolate(labels.youOwe, { amount: formatCents(-balance) })
                : labels.settled}
          </p>
          {balance !== 0 ? (
            <div className="flex w-full flex-col gap-1.5">
              <SettleButton labels={labels} friendId={id} />
              <p className="text-xs text-muted-foreground">{labels.settleHint}</p>
            </div>
          ) : null}
        </Card>

        <section aria-labelledby="shared-title" className="flex flex-col gap-2">
          <h2 id="shared-title" className="text-[15px] font-extrabold">
            {labels.sharedTitle}
          </h2>
          {shared.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.sharedEmpty}</p>
          ) : (
            <Card className="p-0">
              <ul>
                {shared.map((row) => {
                  const title = row.description ?? labels.untitled
                  return (
                    <li
                      key={row.id}
                      className="flex items-center gap-3 border-b border-border py-3 pr-2 pl-4 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{title}</p>
                        <p className="text-[13px] text-muted-foreground">
                          {formatDate(new Date(row.spent_at), { timeZone })} ·{" "}
                          {row.payer_id === user.sub
                            ? labels.paidByYou
                            : interpolate(labels.paidBy, { name })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="num font-extrabold">{formatCents(row.amount_cents)}</p>
                        <p className="num text-[13px] text-muted-foreground">
                          {interpolate(labels.yourShare, {
                            amount: formatCents(row.my_share_cents),
                          })}
                        </p>
                      </div>
                      {row.created_by === user.sub ? (
                        <DeleteSharedButton labels={labels} sharedExpenseId={row.id} name={title} />
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
        </section>

        <RemoveFriendButton labels={labels} friendId={id} />
      </div>
    </>
  )
}

"use client"

import Link from "next/link"

import { Avatar } from "@/components/social/avatar"
import type { FriendOption } from "@/components/social/social-provider"
import { Chip } from "@/components/ui/chip"
import { Input } from "@/components/ui/input"
import type { Dictionary } from "@/i18n/get-dictionary"
import { formatCents } from "@/i18n/format"
import { interpolate } from "@/i18n/interpolate"
import { parseEuros } from "@/lib/amount-input"
import { remainingCents, splitEqually } from "@/lib/split-amounts"

export type SplitState = {
  friendIds: string[]
  mode: "equal" | "custom"
  payerId: string
  /** Importes escritos por persona en modo "por importes" ("7", "3,50"). */
  custom: Record<string, string>
}

export type SplitShare = { userId: string; shareCents: number }

/** Partes de cada uno (tú primero) según el modo elegido. */
export function computeShares(state: SplitState, meId: string, totalCents: number): SplitShare[] {
  const people = [meId, ...state.friendIds]
  if (state.mode === "equal") {
    const amounts = splitEqually(totalCents, people.length)
    return people.map((userId, index) => ({ userId, shareCents: amounts[index] ?? 0 }))
  }
  return people.map((userId) => ({
    userId,
    shareCents: parseEuros(state.custom[userId] ?? "") ?? 0,
  }))
}

type SplitWithFriendsProps = {
  labels: Dictionary["addExpense"]
  me: { id: string; name: string }
  friends: FriendOption[]
  totalCents: number
  value: SplitState
  onChange: (value: SplitState) => void
}

/** Con quién se divide, cómo (a partes iguales o por importes) y quién ha pagado. */
export function SplitWithFriends({
  labels,
  me,
  friends,
  totalCents,
  value,
  onChange,
}: SplitWithFriendsProps) {
  if (friends.length === 0) {
    return (
      <Link
        href="/amigos"
        className="flex min-h-11 items-center text-sm font-bold text-primary-text outline-none focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {labels.splitNeedFriends}
      </Link>
    )
  }

  const selected = friends.filter((friend) => value.friendIds.includes(friend.id))
  const shares = computeShares(value, me.id, totalCents)
  const left = remainingCents(
    totalCents,
    shares.map((share) => share.shareCents),
  )
  const people = [{ id: me.id, name: labels.splitMe }, ...selected]

  const toggleFriend = (id: string) => {
    const friendIds = value.friendIds.includes(id)
      ? value.friendIds.filter((friendId) => friendId !== id)
      : [...value.friendIds, id]
    // Si quien pagó deja de participar, pagas tú.
    const payerId =
      friendIds.includes(value.payerId) || value.payerId === me.id ? value.payerId : me.id
    onChange({ ...value, friendIds, payerId })
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p id="split-friends" className="mb-2 text-[13px] font-extrabold text-muted-foreground">
          {labels.splitFriendsLabel}
        </p>
        <div role="group" aria-labelledby="split-friends" className="flex flex-wrap gap-2">
          {friends.map((friend) => (
            <Chip
              key={friend.id}
              pressed={value.friendIds.includes(friend.id)}
              onPressedChange={() => toggleFriend(friend.id)}
            >
              <Avatar url={friend.avatarUrl} name={friend.name} size={22} />
              {friend.name}
            </Chip>
          ))}
        </div>
      </div>

      {selected.length > 0 ? (
        <>
          <div>
            <p id="split-mode" className="mb-2 text-[13px] font-extrabold text-muted-foreground">
              {labels.splitModeLabel}
            </p>
            <div role="group" aria-labelledby="split-mode" className="flex flex-wrap gap-2">
              <Chip
                pressed={value.mode === "equal"}
                onPressedChange={() => onChange({ ...value, mode: "equal" })}
              >
                {labels.splitEqual}
              </Chip>
              <Chip
                pressed={value.mode === "custom"}
                onPressedChange={() => onChange({ ...value, mode: "custom" })}
              >
                {labels.splitCustom}
              </Chip>
            </div>
          </div>

          {value.mode === "equal" ? (
            <p className="num text-sm font-bold text-primary-text">
              {interpolate(labels.splitEach, {
                amount: formatCents(Math.floor(totalCents / people.length)),
              })}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {people.map((person) => (
                <div key={person.id} className="flex items-center gap-3">
                  <label
                    htmlFor={`share-${person.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-bold"
                  >
                    {person.name}
                  </label>
                  <div className="relative w-32">
                    <Input
                      id={`share-${person.id}`}
                      inputMode="decimal"
                      autoComplete="off"
                      aria-label={interpolate(labels.splitShareLabel, { name: person.name })}
                      value={value.custom[person.id] ?? ""}
                      onChange={(event) =>
                        onChange({
                          ...value,
                          custom: { ...value.custom, [person.id]: event.target.value },
                        })
                      }
                      className="h-11 pr-8 text-right num font-bold"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm font-bold text-muted-foreground"
                    >
                      €
                    </span>
                  </div>
                </div>
              ))}
              <p aria-live="polite" className="num text-sm font-bold text-destructive-text">
                {left > 0
                  ? interpolate(labels.splitRemaining, { amount: formatCents(left) })
                  : left < 0
                    ? interpolate(labels.splitOver, { amount: formatCents(-left) })
                    : null}
              </p>
            </div>
          )}

          <div>
            <p id="split-payer" className="mb-2 text-[13px] font-extrabold text-muted-foreground">
              {labels.splitPayerLabel}
            </p>
            <div role="group" aria-labelledby="split-payer" className="flex flex-wrap gap-2">
              {people.map((person) => (
                <Chip
                  key={person.id}
                  pressed={value.payerId === person.id}
                  onPressedChange={() => onChange({ ...value, payerId: person.id })}
                >
                  {person.name}
                </Chip>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

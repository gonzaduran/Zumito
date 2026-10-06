"use client"

import { cn } from "cn"
import { ChevronRight, Search } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import { ShareButton } from "@/components/plans/share-button"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { Dictionary } from "@/i18n/get-dictionary"
import {
  acceptFriendRequest,
  removeFriend,
  searchUsers,
  sendFriendRequest,
  type SocialResult,
} from "@/lib/actions/social"
import { haptics } from "@/lib/haptics"

import { Avatar } from "./avatar"

export type FriendRow = {
  id: string
  name: string
  username: string | null
  avatarUrl: string | null
  relation: "friend" | "sent" | "received"
  /** "Te debe 2,50 €", "Le debes…" o "Estáis en paz". */
  balance: string
  owes: "them" | "me" | "none"
}

type SearchResult = {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  relation: "friend" | "sent" | "received" | "none"
}

type FriendsManagerProps = {
  labels: Dictionary["friends"]
  share: Dictionary["plans"]["beta"]
  friends: FriendRow[]
  /** Texto de la invitación ("Agrégame en Zumito: @gonzalo"). */
  inviteText: string
  /** Búsqueda inicial (p. ej. desde un enlace de invitación ?u=juan). */
  initialQuery?: string
  /** Convierte la fila de la búsqueda en datos para mostrar (foto y nombre). */
  avatarBase: string
}

const SEARCH_DELAY_MS = 300

function Person({
  name,
  username,
  avatarUrl,
}: {
  name: string
  username: string | null
  avatarUrl: string | null
}) {
  return (
    <>
      <Avatar url={avatarUrl} name={name} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{name}</span>
        {username ? (
          <span className="block truncate text-[13px] text-muted-foreground">@{username}</span>
        ) : null}
      </span>
    </>
  )
}

/** Buscar por @usuario, solicitudes, lista de amigos con su saldo e invitar. */
export function FriendsManager({
  labels,
  share,
  friends,
  inviteText,
  initialQuery = "",
  avatarBase,
}: FriendsManagerProps) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const term = query.trim().replace(/^@/, "")
    if (term.length < 3) return
    const timeout = setTimeout(async () => {
      const rows = await searchUsers(term).catch(() => [])
      setResults(
        rows.map((row) => ({
          id: row.id,
          name: row.display_name ?? `@${row.username}`,
          username: row.username,
          avatarUrl: row.avatar_path ? `${avatarBase}/${row.avatar_path}` : null,
          relation: row.relation,
        })),
      )
    }, SEARCH_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [query, avatarBase])

  const run = (action: () => Promise<SocialResult>, success: string, after?: () => void) =>
    startTransition(async () => {
      const result = await action().catch(() => ({ ok: false, error: "failed" }) as const)
      if (result.ok) {
        haptics.success()
        toast.success(success)
        after?.()
      } else {
        haptics.error()
        toast.error(labels.failed)
      }
    })

  // Con menos de 3 letras no se enseñan resultados (aunque queden los de antes).
  const visibleResults = query.trim().replace(/^@/, "").length >= 3 ? results : null

  const setRelation = (id: string, relation: SearchResult["relation"]) =>
    setResults(
      (current) => current?.map((row) => (row.id === id ? { ...row, relation } : row)) ?? null,
    )

  const received = friends.filter((friend) => friend.relation === "received")
  const sent = friends.filter((friend) => friend.relation === "sent")
  const accepted = friends.filter((friend) => friend.relation === "friend")

  return (
    <div className="flex flex-col gap-7">
      <section aria-labelledby="friends-search" className="flex flex-col gap-2">
        <h2 id="friends-search" className="text-[15px] font-extrabold">
          {labels.searchLabel}
        </h2>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-labelledby="friends-search"
            aria-describedby="friends-search-hint"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={labels.searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded-full pl-11"
          />
        </div>
        <p id="friends-search-hint" className="text-xs text-muted-foreground">
          {labels.searchHint}
        </p>
        {visibleResults !== null ? (
          visibleResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.noResults}</p>
          ) : (
            <Card className="p-0">
              <ul aria-live="polite">
                {visibleResults.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <Person name={row.name} username={row.username} avatarUrl={row.avatarUrl} />
                    {row.relation === "none" ? (
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => sendFriendRequest(row.id),
                            labels.requestSent,
                            () => setRelation(row.id, "sent"),
                          )
                        }
                      >
                        {labels.add}
                      </Button>
                    ) : row.relation === "received" ? (
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => acceptFriendRequest(row.id),
                            labels.added,
                            () => setRelation(row.id, "friend"),
                          )
                        }
                      >
                        {labels.accept}
                      </Button>
                    ) : (
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">
                        {row.relation === "friend" ? labels.alreadyFriends : labels.pending}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )
        ) : null}
      </section>

      {received.length > 0 ? (
        <section aria-labelledby="friends-received" className="flex flex-col gap-2">
          <h2 id="friends-received" className="text-[15px] font-extrabold">
            {labels.receivedTitle}
          </h2>
          <Card className="p-0">
            <ul>
              {received.map((friend) => (
                <li
                  key={friend.id}
                  className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                >
                  <Person
                    name={friend.name}
                    username={friend.username}
                    avatarUrl={friend.avatarUrl}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => run(() => acceptFriendRequest(friend.id), labels.added)}
                    >
                      {labels.accept}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => run(() => removeFriend(friend.id), labels.declined)}
                    >
                      {labels.decline}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <section aria-labelledby="friends-list" className="flex flex-col gap-2">
        <h2 id="friends-list" className="text-[15px] font-extrabold">
          {labels.listTitle}
        </h2>
        {accepted.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          <Card className="p-0">
            <ul>
              {accepted.map((friend) => (
                <li key={friend.id} className="border-b border-border last:border-b-0">
                  <Link
                    href={`/amigos/${friend.id}`}
                    className="flex min-h-16 items-center gap-3 px-4 py-3 outline-none focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <Person
                      name={friend.name}
                      username={friend.username}
                      avatarUrl={friend.avatarUrl}
                    />
                    <span
                      className={cn(
                        "text-right num text-[13px] font-bold",
                        friend.owes === "them" && "text-primary-text",
                        friend.owes === "me" && "text-destructive-text",
                        friend.owes === "none" && "text-muted-foreground",
                      )}
                    >
                      {friend.balance}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-5 shrink-0 text-muted-foreground"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {sent.length > 0 ? (
        <section aria-labelledby="friends-sent" className="flex flex-col gap-2">
          <h2 id="friends-sent" className="text-[15px] font-extrabold">
            {labels.sentTitle}
          </h2>
          <Card className="p-0">
            <ul>
              {sent.map((friend) => (
                <li
                  key={friend.id}
                  className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                >
                  <Person
                    name={friend.name}
                    username={friend.username}
                    avatarUrl={friend.avatarUrl}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => run(() => removeFriend(friend.id), labels.declined)}
                  >
                    {labels.cancel}
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <section
        aria-labelledby="friends-invite"
        className="flex flex-col gap-3 rounded-lg bg-primary-wash p-5"
      >
        <h2 id="friends-invite" className="font-extrabold">
          {labels.inviteTitle}
        </h2>
        <p className="text-sm">{inviteText}</p>
        <ShareButton
          label={labels.invite}
          title={share.shareTitle}
          text={inviteText}
          copiedLabel={share.copied}
          size="md"
          variant="primary"
        />
      </section>
    </div>
  )
}

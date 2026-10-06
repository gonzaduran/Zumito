import { cn } from "cn"
import Link from "next/link"

import { Avatar } from "@/components/social/avatar"

export type FriendBalanceItem = {
  id: string
  name: string
  avatarUrl: string | null
  /** "Te debe 2,50 €" o "Le debes 3,00 €". */
  balance: string
  owesMe: boolean
}

type FriendsCardProps = {
  title: string
  seeAll: { href: string; label: string }
  items: FriendBalanceItem[]
}

/** Quién te debe y a quién debes (solo los saldos pendientes). */
export function FriendsCard({ title, seeAll, items }: FriendsCardProps) {
  return (
    <section aria-labelledby="friends-home-title">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id="friends-home-title" className="text-[17px] font-extrabold">
          {title}
        </h2>
        <Link
          href={seeAll.href}
          className="text-sm font-bold text-primary-text outline-none focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {seeAll.label}
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/amigos/${item.id}`}
              className="flex min-h-14 items-center gap-3 rounded-lg bg-card px-4 py-3 shadow-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Avatar url={item.avatarUrl} name={item.name} size={36} />
              <span className="min-w-0 flex-1 truncate font-bold">{item.name}</span>
              <span
                className={cn(
                  "num text-sm font-extrabold",
                  item.owesMe ? "text-primary-text" : "text-destructive-text",
                )}
              >
                {item.balance}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

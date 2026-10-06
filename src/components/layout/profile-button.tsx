import { UserRound } from "lucide-react"
import Link from "next/link"

import { Avatar } from "@/components/social/avatar"

type ProfileButtonProps = {
  label: string
  /** Tu foto y tu nombre (para la inicial si no hay foto). Sin nombre, el icono. */
  avatarUrl?: string | null
  name?: string | null
}

export function ProfileButton({ label, avatarUrl, name }: ProfileButtonProps) {
  return (
    <Link
      href="/ajustes"
      aria-label={label}
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {avatarUrl || name ? (
        <Avatar url={avatarUrl ?? null} name={name ?? ""} size={44} />
      ) : (
        <UserRound aria-hidden="true" className="size-[18px]" strokeWidth={2} />
      )}
    </Link>
  )
}

import { UserRound } from "lucide-react"
import Link from "next/link"

export function ProfileButton({ label }: { label: string }) {
  return (
    <Link
      href="/ajustes"
      aria-label={label}
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <UserRound aria-hidden="true" className="size-[18px]" strokeWidth={2} />
    </Link>
  )
}

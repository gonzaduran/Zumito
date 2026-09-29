import { cn } from "cn"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"

type MonthSwitcherProps = {
  label: string
  previous: { href: string; label: string }
  /** Sin siguiente cuando es el mes en curso. */
  next: { href: string; label: string } | null
  navLabel: string
}

export function MonthSwitcher({ label, previous, next, navLabel }: MonthSwitcherProps) {
  const arrow = cn(buttonVariants({ variant: "secondary", size: "icon" }))
  return (
    <nav aria-label={navLabel} className="flex items-center justify-between gap-2">
      <Link href={previous.href} scroll={false} aria-label={previous.label} className={arrow}>
        <ChevronLeft aria-hidden="true" />
      </Link>
      <p aria-live="polite" className="text-[15px] font-extrabold first-letter:uppercase">
        {label}
      </p>
      {next ? (
        <Link href={next.href} scroll={false} aria-label={next.label} className={arrow}>
          <ChevronRight aria-hidden="true" />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(arrow, "opacity-40")}>
          <ChevronRight />
        </span>
      )}
    </nav>
  )
}

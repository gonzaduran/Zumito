"use client"

import { cn } from "cn"
import { ChartPie, House, ListOrdered, Plus, Settings, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { Dictionary } from "@/i18n/get-dictionary"

type BottomNavProps = {
  labels: Dictionary["nav"]
  closeLabel: string
  addExpense: Dictionary["addExpense"]
}

type NavItem = { href: string; label: string; icon: LucideIcon }

export function BottomNav({ labels, closeLabel, addExpense }: BottomNavProps) {
  const pathname = usePathname()

  const left: NavItem[] = [
    { href: "/", label: labels.home, icon: House },
    { href: "/historial", label: labels.history, icon: ListOrdered },
  ]
  const right: NavItem[] = [
    { href: "/estadisticas", label: labels.stats, icon: ChartPie },
    { href: "/ajustes", label: labels.settings, icon: Settings },
  ]

  const renderItem = ({ href, label, icon: Icon }: NavItem) => {
    const active = pathname === href
    return (
      <li key={href} className="flex flex-1">
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex tap flex-1 flex-col items-center justify-center gap-1 rounded-sm text-muted-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            active && "text-primary",
          )}
        >
          <Icon aria-hidden="true" className="size-[22px]" strokeWidth={active ? 2.4 : 2} />
          <span className="text-[10px] font-bold">{label}</span>
        </Link>
      </li>
    )
  }

  return (
    <nav
      aria-label={labels.label}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex h-(--nav-height) max-w-lg items-stretch px-2">
        {left.map(renderItem)}
        <li className="flex flex-1 items-center justify-center">
          <Sheet>
            <SheetTrigger
              aria-label={labels.add}
              className="flex size-14 -translate-y-3 items-center justify-center rounded-full bg-linear-155 from-primary to-primary-strong text-primary-foreground shadow-[0_8px_18px_-4px_var(--primary-wash)] ring-4 ring-background transition-transform outline-none focus-visible:ring-ring active:scale-95"
            >
              <Plus aria-hidden="true" className="size-7" strokeWidth={2.6} />
            </SheetTrigger>
            <SheetContent closeLabel={closeLabel}>
              <SheetHeader>
                <SheetTitle>{addExpense.title}</SheetTitle>
              </SheetHeader>
              <p className="px-5 pt-1 pb-6 text-sm text-muted-foreground">
                {addExpense.comingSoon}
              </p>
            </SheetContent>
          </Sheet>
        </li>
        {right.map(renderItem)}
      </ul>
    </nav>
  )
}

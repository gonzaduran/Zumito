"use client"

import { cn } from "cn"
import { ChartPie, House, ListOrdered, Settings, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { AddExpenseSheet } from "@/components/expenses/add-expense-sheet"
import type { Dictionary } from "@/i18n/get-dictionary"
import type { Category } from "@/lib/data/categories"

type BottomNavProps = {
  labels: Dictionary["nav"]
  closeLabel: string
  addExpense: Dictionary["addExpense"]
  categories: Category[]
  lastUsedCategoryId: string | null
}

type NavItem = { href: string; label: string; icon: LucideIcon }

export function BottomNav({
  labels,
  closeLabel,
  addExpense,
  categories,
  lastUsedCategoryId,
}: BottomNavProps) {
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
    // Las subpantallas (p. ej. /ajustes/presupuestos) marcan su sección.
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
    return (
      <li key={href} className="flex flex-1">
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex tap flex-1 flex-col items-center justify-center gap-1 rounded-sm text-muted-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            active && "text-primary-text",
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-glass pb-[env(safe-area-inset-bottom)] backdrop-blur-lg backdrop-saturate-150"
    >
      <ul className="mx-auto flex h-(--nav-height) max-w-lg items-stretch px-2">
        {left.map(renderItem)}
        <li className="flex flex-1 items-center justify-center">
          <AddExpenseSheet
            labels={addExpense}
            triggerLabel={labels.add}
            closeLabel={closeLabel}
            categories={categories}
            lastUsedCategoryId={lastUsedCategoryId}
          />
        </li>
        {right.map(renderItem)}
      </ul>
    </nav>
  )
}

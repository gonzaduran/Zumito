"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { useAccounts } from "@/components/accounts/accounts-provider"
import { useExpenseSaver } from "@/hooks/use-expense-saver"
import type { Dictionary } from "@/i18n/get-dictionary"
import { formatCents } from "@/i18n/format"
import { fromCents } from "@/lib/amount-input"
import type { Category } from "@/lib/data/categories"

type QuickPickProps = {
  labels: Dictionary["quickPick"]
  addLabels: Dictionary["addExpense"]
  offlineLabels: Dictionary["offline"]
  categories: Category[]
  /** Importe que trae el atajo; sin él, la categoría abre el formulario. */
  amountCents?: number
}

/**
 * Pantalla del atajo: tus categorías en grande. Con importe, tocar una guarda el gasto
 * (2 toques en total desde el atajo); sin importe, abre el formulario con ella elegida.
 */
export function QuickPick({
  labels,
  addLabels,
  offlineLabels,
  categories,
  amountCents,
}: QuickPickProps) {
  const router = useRouter()
  const save = useExpenseSaver(addLabels, offlineLabels)
  const { accounts, lastUsedAccountId } = useAccounts()
  const accountId = accounts.find((a) => a.id === lastUsedAccountId)?.id ?? accounts[0]?.id

  const pick = (category: Category) => {
    if (!amountCents) {
      router.push(`/add?categoria=${encodeURIComponent(category.name)}`)
      return
    }
    save(
      {
        id: crypto.randomUUID(),
        categoryId: category.id,
        accountId,
        amountCents,
        spentAt: new Date(),
      },
      category.name,
    )
    router.replace("/")
  }

  return (
    <div className="flex flex-col gap-5 px-6 pb-8">
      {amountCents ? (
        <p className="text-center num text-[52px] leading-none font-extrabold tracking-[-0.02em]">
          {formatCents(amountCents)}
        </p>
      ) : null}
      <h2 id="quick-pick-title" className="text-center text-lg font-extrabold">
        {amountCents ? labels.titleWithAmount : labels.title}
      </h2>
      <ul aria-labelledby="quick-pick-title" className="grid grid-cols-3 gap-3">
        {categories.map((category) => (
          <li key={category.id}>
            <button
              type="button"
              onClick={() => pick(category)}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-lg bg-card p-2 shadow-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95"
            >
              <span aria-hidden="true" className="text-3xl">
                {category.emoji}
              </span>
              <span className="line-clamp-2 text-center text-[13px] leading-tight font-bold">
                {category.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Link
        href={amountCents ? `/add?importe=${encodeURIComponent(fromCents(amountCents))}` : "/add"}
        className="flex min-h-11 items-center justify-center text-sm font-bold text-primary-text outline-none focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {labels.fullForm}
      </Link>
    </div>
  )
}

"use client"

import { TriangleAlert } from "lucide-react"
import { useRouter } from "next/navigation"

import { useExpenseSaver } from "@/hooks/use-expense-saver"
import { useSharedSaver } from "@/hooks/use-shared-saver"
import type { Dictionary } from "@/i18n/get-dictionary"
import type { Category } from "@/lib/data/categories"
import type { NamedOption } from "@/lib/suggestions"

import { ExpenseForm, type ExpensePrefill } from "./expense-form"

type AddExpenseScreenProps = {
  labels: Dictionary["addExpense"]
  offlineLabels: Dictionary["offline"]
  categories: Category[]
  places: NamedOption[]
  people: NamedOption[]
  defaultCategoryId: string
  prefill: ExpensePrefill
  /** Avisos sobre parámetros del enlace que no se han podido usar. */
  notices: string[]
}

/** Pantalla de /add: el mismo formulario del "+", prellenado desde la URL. */
export function AddExpenseScreen({
  labels,
  offlineLabels,
  categories,
  places,
  people,
  defaultCategoryId,
  prefill,
  notices,
}: AddExpenseScreenProps) {
  const router = useRouter()
  const save = useExpenseSaver(labels, offlineLabels)
  const saveShared = useSharedSaver(labels)

  return (
    <div className="flex flex-col gap-4 pb-6">
      {notices.map((notice) => (
        <p
          key={notice}
          role="status"
          className="mx-5 flex items-start gap-2 rounded-md bg-secondary px-4 py-3 text-[13px] font-semibold"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-cat-amber" />
          {notice}
        </p>
      ))}
      <ExpenseForm
        labels={labels}
        submitLabel={labels.save}
        categories={categories}
        places={places}
        people={people}
        prefill={prefill}
        defaultCategoryId={defaultCategoryId}
        allowSplit
        onSubmit={(expense, category, split) => {
          if (split) saveShared(expense, split)
          else save(expense, category.name)
          router.replace("/")
        }}
      />
    </div>
  )
}

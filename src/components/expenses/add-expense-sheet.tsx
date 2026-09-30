"use client"

import { Plus } from "lucide-react"
import { useState } from "react"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useExpenseSaver } from "@/hooks/use-expense-saver"
import type { Dictionary } from "@/i18n/get-dictionary"
import type { Category } from "@/lib/data/categories"
import type { NamedOption } from "@/lib/suggestions"

import { ExpenseForm } from "./expense-form"

type AddExpenseSheetProps = {
  labels: Dictionary["addExpense"]
  offlineLabels: Dictionary["offline"]
  triggerLabel: string
  closeLabel: string
  categories: Category[]
  places: NamedOption[]
  people: NamedOption[]
  /** Categoría del último gasto; si no hay, la primera. */
  lastUsedCategoryId: string | null
}

/**
 * Botón "+" y panel de nuevo gasto. Guardado optimista: el panel se cierra al
 * instante y el gasto se envía en segundo plano, con opción de deshacer.
 */
export function AddExpenseSheet({
  labels,
  offlineLabels,
  triggerLabel,
  closeLabel,
  categories,
  places,
  people,
  lastUsedCategoryId,
}: AddExpenseSheetProps) {
  const [open, setOpen] = useState(false)
  const [lastCategoryId, setLastCategoryId] = useState(lastUsedCategoryId)
  const save = useExpenseSaver(labels, offlineLabels)

  const defaultCategoryId =
    categories.find((c) => c.id === lastCategoryId)?.id ?? categories[0]?.id ?? ""

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={triggerLabel}
        className="flex size-14 -translate-y-3 items-center justify-center rounded-full bg-linear-155 from-primary to-primary-strong text-primary-foreground shadow-[0_8px_18px_-4px_var(--primary-wash)] ring-4 ring-background transition-transform outline-none focus-visible:ring-ring active:scale-95"
      >
        <Plus aria-hidden="true" className="size-7" strokeWidth={2.6} />
      </SheetTrigger>
      <SheetContent closeLabel={closeLabel}>
        <SheetHeader>
          <SheetTitle>{labels.title}</SheetTitle>
        </SheetHeader>
        <ExpenseForm
          labels={labels}
          submitLabel={labels.save}
          categories={categories}
          places={places}
          people={people}
          defaultCategoryId={defaultCategoryId}
          onSubmit={(expense, category) => {
            setOpen(false)
            setLastCategoryId(category.id)
            save(expense, category.name)
          }}
        />
      </SheetContent>
    </Sheet>
  )
}

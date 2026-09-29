"use client"

import { Plus } from "lucide-react"
import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { formatCents } from "@/i18n/format"
import type { Dictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { createExpense, deleteExpense } from "@/lib/actions/expenses"
import type { Category } from "@/lib/data/categories"
import { haptics } from "@/lib/haptics"

import { AddExpenseForm, type NewExpense } from "./add-expense-form"

type AddExpenseSheetProps = {
  labels: Dictionary["addExpense"]
  triggerLabel: string
  closeLabel: string
  categories: Category[]
  /** Categoría del último gasto; si no hay, la primera. */
  lastUsedCategoryId: string | null
}

/**
 * Botón "+" y panel de nuevo gasto. Guardado optimista: el panel se cierra al
 * instante y el gasto se envía en segundo plano, con opción de deshacer.
 */
export function AddExpenseSheet({
  labels,
  triggerLabel,
  closeLabel,
  categories,
  lastUsedCategoryId,
}: AddExpenseSheetProps) {
  const [open, setOpen] = useState(false)
  const [lastCategoryId, setLastCategoryId] = useState(lastUsedCategoryId)
  const [, startTransition] = useTransition()
  // Guardados en curso: deshacer espera a que termine el suyo.
  const pending = useRef(new Map<string, Promise<{ ok: boolean }>>())

  const defaultCategoryId =
    categories.find((c) => c.id === lastCategoryId)?.id ?? categories[0]?.id ?? ""

  const persist = (expense: NewExpense) => {
    const request = createExpense(expense)
    pending.current.set(expense.id, request)
    startTransition(async () => {
      const { ok } = await request
      if (ok) return
      haptics.error()
      toast.error(labels.saveFailed, {
        id: expense.id,
        description: undefined,
        action: { label: labels.retry, onClick: () => persist(expense) },
      })
    })
  }

  const undo = (id: string) => {
    startTransition(async () => {
      await pending.current.get(id)
      const { ok } = await deleteExpense(id)
      pending.current.delete(id)
      if (ok) toast(labels.undone, { id, description: undefined, action: undefined })
      else toast.error(labels.undoFailed, { id, description: undefined })
    })
  }

  const handleSave = (expense: NewExpense, category: Category) => {
    setOpen(false)
    setLastCategoryId(category.id)
    haptics.success()
    toast.success(labels.saved, {
      id: expense.id,
      description: interpolate(labels.savedDescription, {
        amount: formatCents(expense.amountCents),
        category: category.name,
      }),
      duration: 6000,
      action: { label: labels.undo, onClick: () => undo(expense.id) },
    })
    persist(expense)
  }

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
        <AddExpenseForm
          labels={labels}
          categories={categories}
          defaultCategoryId={defaultCategoryId}
          onSave={handleSave}
        />
      </SheetContent>
    </Sheet>
  )
}

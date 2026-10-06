"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import type { ExpenseDraft, ExpenseSplit } from "@/components/expenses/expense-form"
import type { Dictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { createSharedExpense } from "@/lib/actions/social"
import { haptics } from "@/lib/haptics"
import { settle } from "@/lib/settle"

/**
 * Guarda un gasto dividido con amigos. Necesita conexión (afecta a varias personas), así
 * que no va a la cola sin conexión: si falla, ofrece "Reintentar" con el mismo id.
 */
export function useSharedSaver(labels: Dictionary["addExpense"]) {
  const [, startTransition] = useTransition()

  const save = (expense: ExpenseDraft, split: ExpenseSplit) => {
    haptics.success()
    toast.success(interpolate(labels.savedShared, { names: split.names }), { id: expense.id })
    startTransition(async () => {
      const { ok } = await settle(
        createSharedExpense({
          id: expense.id,
          categoryId: expense.categoryId,
          accountId: expense.accountId,
          amountCents: expense.amountCents,
          description: expense.description,
          spentAt: expense.spentAt,
          payerId: split.payerId,
          shares: split.shares,
        }),
      )
      if (ok) return
      haptics.error()
      toast.error(labels.sharedFailed, {
        id: expense.id,
        action: { label: labels.retry, onClick: () => save(expense, split) },
      })
    })
  }

  return save
}

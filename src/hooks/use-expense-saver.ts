"use client"

import { useRef, useTransition } from "react"
import { toast } from "sonner"

import type { ExpenseDraft } from "@/components/expenses/expense-form"
import { formatCents } from "@/i18n/format"
import type { Dictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { createExpense, deleteExpense } from "@/lib/actions/expenses"
import { haptics } from "@/lib/haptics"
import { dequeue, enqueue, isOffline } from "@/lib/offline-queue"
import { settle } from "@/lib/settle"

type SaverLabels = Dictionary["addExpense"]

/**
 * Guardado optimista de un gasto nuevo: avisa al instante con "Deshacer" y lo envía en
 * segundo plano. Sin conexión va a la cola; si falla, ofrece "Reintentar".
 */
export function useExpenseSaver(labels: SaverLabels, offlineLabels: Dictionary["offline"]) {
  const [, startTransition] = useTransition()
  // Guardados en curso: deshacer espera a que termine el suyo.
  const pending = useRef(new Map<string, Promise<{ ok: boolean }>>())

  const undo = (id: string) => {
    // Si aún estaba en la cola sin conexión, basta con quitarlo de ella.
    if (dequeue(id)) {
      toast(labels.undone, { id, description: undefined, action: undefined })
      return
    }
    startTransition(async () => {
      const saving = pending.current.get(id)
      if (saving) await settle(saving)
      const { ok } = await settle(deleteExpense(id))
      pending.current.delete(id)
      if (ok) toast(labels.undone, { id, description: undefined, action: undefined })
      else toast.error(labels.undoFailed, { id, description: undefined })
    })
  }

  /** Sin conexión: el gasto espera en la cola y se envía al volver la red. */
  const queue = (expense: ExpenseDraft) => {
    enqueue(expense)
    toast.info(offlineLabels.queued, {
      id: expense.id,
      action: { label: labels.undo, onClick: () => undo(expense.id) },
    })
  }

  const persist = (expense: ExpenseDraft) => {
    if (isOffline()) return queue(expense)
    const request = createExpense(expense)
    pending.current.set(expense.id, request)
    startTransition(async () => {
      let ok: boolean
      try {
        ;({ ok } = await request)
      } catch (error) {
        pending.current.delete(expense.id)
        if (isOffline(error)) return queue(expense)
        ok = false
      }
      if (ok) return
      haptics.error()
      toast.error(labels.saveFailed, {
        id: expense.id,
        description: undefined,
        action: { label: labels.retry, onClick: () => persist(expense) },
      })
    })
  }

  return (expense: ExpenseDraft, categoryName: string) => {
    haptics.success()
    toast.success(labels.saved, {
      id: expense.id,
      description: interpolate(labels.savedDescription, {
        amount: formatCents(expense.amountCents),
        category: categoryName,
      }),
      duration: 6000,
      action: { label: labels.undo, onClick: () => undo(expense.id) },
    })
    persist(expense)
  }
}

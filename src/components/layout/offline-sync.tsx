"use client"

import { useEffect } from "react"
import { toast } from "sonner"

import { createExpense } from "@/lib/actions/expenses"
import { dequeue, readQueue } from "@/lib/offline-queue"

/** Cerrojo común: nunca hay dos sincronizaciones a la vez, aunque se disparen varias. */
let syncing = false

/** Envía los gastos apuntados sin conexión al abrir la app y cada vez que vuelve la red. */
export function OfflineSync({ syncedLabel }: { syncedLabel: string }) {
  useEffect(() => {
    const flush = async () => {
      if (syncing || navigator.onLine === false) return
      syncing = true
      let sent = 0
      try {
        for (const expense of readQueue()) {
          const { ok } = await createExpense(expense)
          // Solo sale de la cola cuando se ha guardado; si falla, se reintenta otra vez.
          if (!ok) break
          dequeue(expense.id)
          sent++
        }
      } catch {
        // Se ha vuelto a perder la conexión: lo que quede se envía la próxima vez.
      } finally {
        syncing = false
      }
      if (sent > 0) toast.success(syncedLabel)
    }

    void flush()
    window.addEventListener("online", flush)
    return () => window.removeEventListener("online", flush)
  }, [syncedLabel])

  return null
}

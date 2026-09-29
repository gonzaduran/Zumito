import type { ExpenseInput } from "@/lib/validators/expense"

/**
 * Cola de gastos apuntados sin conexión, guardada en el navegador. Se envían al
 * volver la conexión; como el id se genera en el cliente, reintentar nunca duplica.
 */

export type QueuedExpense = ExpenseInput & { id: string }

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">

const KEY = "zumito:pending-expenses"

const defaultStorage = (): Storage | null =>
  typeof localStorage === "undefined" ? null : localStorage

export function readQueue(storage: Storage | null = defaultStorage()): QueuedExpense[] {
  try {
    const raw = storage?.getItem(KEY)
    if (!raw) return []
    const items = JSON.parse(raw) as (Omit<QueuedExpense, "spentAt"> & { spentAt: string })[]
    return items.map((item) => ({ ...item, spentAt: new Date(item.spentAt) }))
  } catch {
    return []
  }
}

function writeQueue(items: QueuedExpense[], storage: Storage | null) {
  try {
    storage?.setItem(KEY, JSON.stringify(items))
  } catch {
    // Sin almacenamiento (modo privado): el gasto se pierde solo si se cierra la app sin red.
  }
}

export function enqueue(expense: QueuedExpense, storage: Storage | null = defaultStorage()) {
  const items = readQueue(storage).filter((item) => item.id !== expense.id)
  writeQueue([...items, expense], storage)
}

/** Quita un gasto de la cola. Devuelve si estaba en ella. */
export function dequeue(id: string, storage: Storage | null = defaultStorage()): boolean {
  const items = readQueue(storage)
  const rest = items.filter((item) => item.id !== id)
  writeQueue(rest, storage)
  return rest.length !== items.length
}

/** Un fallo de red al llamar a una acción de servidor (no un error de validación). */
export function isOffline(error?: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true
  return error instanceof TypeError
}

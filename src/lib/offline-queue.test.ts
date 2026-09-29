import { describe, expect, it } from "vitest"

import { dequeue, enqueue, isOffline, readQueue, type QueuedExpense } from "./offline-queue"

const memoryStorage = () => {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  }
}

const expense = (id: string): QueuedExpense => ({
  id,
  categoryId: "8f14e45f-ceea-467a-9575-6c2a1c8e2b3d",
  amountCents: 1250,
  description: "Café",
  spentAt: new Date("2026-09-30T08:00:00Z"),
})

describe("cola sin conexión", () => {
  it("guarda y recupera los gastos con su fecha", () => {
    const storage = memoryStorage()
    enqueue(expense("a"), storage)
    const [item] = readQueue(storage)
    expect(item?.id).toBe("a")
    expect(item?.spentAt).toBeInstanceOf(Date)
    expect(item?.spentAt.toISOString()).toBe("2026-09-30T08:00:00.000Z")
  })

  it("no duplica el mismo gasto", () => {
    const storage = memoryStorage()
    enqueue(expense("a"), storage)
    enqueue(expense("a"), storage)
    expect(readQueue(storage)).toHaveLength(1)
  })

  it("quita un gasto y dice si estaba", () => {
    const storage = memoryStorage()
    enqueue(expense("a"), storage)
    enqueue(expense("b"), storage)
    expect(dequeue("a", storage)).toBe(true)
    expect(dequeue("a", storage)).toBe(false)
    expect(readQueue(storage).map((i) => i.id)).toEqual(["b"])
  })

  it("con datos corruptos o sin almacenamiento, la cola está vacía", () => {
    const storage = memoryStorage()
    storage.setItem("zumito:pending-expenses", "{no es json")
    expect(readQueue(storage)).toEqual([])
    expect(readQueue(null)).toEqual([])
    expect(() => enqueue(expense("a"), null)).not.toThrow()
  })

  it("un TypeError de fetch es falta de conexión", () => {
    expect(isOffline(new TypeError("Failed to fetch"))).toBe(true)
    expect(isOffline(new Error("otro"))).toBe(false)
  })
})

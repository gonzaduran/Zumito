import { z } from "zod"

import { parseEuros } from "@/lib/amount-input"
import { findByName } from "@/lib/suggestions"
import { amountCentsSchema } from "@/lib/validators/money"

type Param = string | string[] | undefined

export type QuickAddPrefill = {
  categoryId?: string
  amountCents?: number
  description?: string
  place?: string
  /** Parámetros que venían pero no se han podido usar. */
  invalid: ("categoria" | "importe")[]
  /** Nombre de categoría pedido que no existe (para avisar). */
  unknownCategory?: string
}

const single = (value: Param) => (Array.isArray(value) ? value[0] : value)
const text = (max: number) => z.string().trim().min(1).max(max)

/**
 * Lee /add?categoria=&importe=&descripcion=&lugar= para prellenar el formulario.
 * La categoría se busca por nombre (sin distinguir mayúsculas ni tildes) entre las activas.
 */
export function parseQuickAddParams(
  params: Record<string, Param>,
  categories: { id: string; name: string }[],
): QuickAddPrefill {
  const result: QuickAddPrefill = { invalid: [] }

  const categoryName = single(params.categoria)
  if (categoryName !== undefined) {
    const category = text(30).safeParse(categoryName).success
      ? findByName(categories, categoryName)
      : undefined
    if (category) result.categoryId = category.id
    else {
      result.invalid.push("categoria")
      result.unknownCategory = categoryName.trim().slice(0, 30)
    }
  }

  const amount = single(params.importe)
  if (amount !== undefined) {
    const cents = parseEuros(amount.slice(0, 20))
    const parsed = amountCentsSchema.safeParse(cents)
    if (parsed.success) result.amountCents = parsed.data
    else result.invalid.push("importe")
  }

  const description = text(80).safeParse(single(params.descripcion))
  if (description.success) result.description = description.data

  const place = text(80).safeParse(single(params.lugar))
  if (place.success) result.place = place.data

  return result
}

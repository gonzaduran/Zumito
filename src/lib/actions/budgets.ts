"use server"

import { revalidatePath } from "next/cache"

import { parseEuros } from "@/lib/amount-input"
import { createClient } from "@/lib/supabase/server"
import { budgetInputSchema } from "@/lib/validators/budget"

export type SaveBudgetsState = {
  status: "idle" | "saved" | "error"
  /** Campos con un importe no válido ("total" o el id de la categoría). */
  invalid: string[]
}

const TOTAL_FIELD = "total"
const CATEGORY_PREFIX = "category:"

/** Guarda todos los presupuestos del formulario de una vez. Un campo vacío = sin límite. */
export async function saveBudgets(
  _prev: SaveBudgetsState,
  formData: FormData,
): Promise<SaveBudgetsState> {
  const invalid: string[] = []
  const budgets: { category_id: string | null; amount_cents: number }[] = []

  for (const [key, raw] of formData.entries()) {
    const isTotal = key === TOTAL_FIELD
    if (!isTotal && !key.startsWith(CATEGORY_PREFIX)) continue
    const field = isTotal ? TOTAL_FIELD : key.slice(CATEGORY_PREFIX.length)
    const cents = parseEuros(String(raw))
    if (cents === null) continue
    const parsed = budgetInputSchema.safeParse({
      categoryId: isTotal ? null : field,
      amountCents: cents,
    })
    if (!parsed.success) {
      invalid.push(field)
      continue
    }
    budgets.push({ category_id: parsed.data.categoryId, amount_cents: parsed.data.amountCents })
  }

  if (invalid.length > 0) return { status: "error", invalid }

  const supabase = await createClient()
  const { error } = await supabase.rpc("set_budgets", { p_budgets: budgets })
  if (error) return { status: "error", invalid: [] }

  revalidatePath("/", "layout")
  return { status: "saved", invalid: [] }
}

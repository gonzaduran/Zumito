"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { expenseInputSchema, type ExpenseInput } from "@/lib/validators/expense"

type ActionResult = { ok: boolean }

/** Violación de clave única: el gasto ya se guardó (reintento del mismo id). */
const UNIQUE_VIOLATION = "23505"

export async function createExpense(input: ExpenseInput): Promise<ActionResult> {
  const parsed = expenseInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false }

  const { id, categoryId, amountCents, description, note, spentAt } = parsed.data
  const supabase = await createClient()
  const { error } = await supabase.from("expenses").insert({
    id,
    category_id: categoryId,
    amount_cents: amountCents,
    description: description ?? null,
    note: note ?? null,
    spent_at: spentAt.toISOString(),
  })
  if (error && error.code !== UNIQUE_VIOLATION) return { ok: false }

  revalidatePath("/", "layout")
  return { ok: true }
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const parsed = z.uuid().safeParse(id)
  if (!parsed.success) return { ok: false }

  const supabase = await createClient()
  const { error } = await supabase.from("expenses").delete().eq("id", parsed.data)
  if (error) return { ok: false }

  revalidatePath("/", "layout")
  return { ok: true }
}

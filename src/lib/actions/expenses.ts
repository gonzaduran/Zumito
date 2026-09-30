"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { expenseInputSchema, type ExpenseInput } from "@/lib/validators/expense"

type ActionResult = { ok: boolean }

/**
 * Crea o actualiza un gasto con su lugar y sus personas en una sola transacción
 * (función SQL save_expense). Reenviar el mismo id no lo duplica.
 */
async function saveExpense(input: ExpenseInput & { id?: string }): Promise<ActionResult> {
  const parsed = expenseInputSchema.required({ id: true }).safeParse(input)
  if (!parsed.success) return { ok: false }

  const expense = parsed.data
  const supabase = await createClient()
  const { error } = await supabase.rpc("save_expense", {
    p_id: expense.id,
    p_category_id: expense.categoryId,
    p_amount_cents: expense.amountCents,
    p_spent_at: expense.spentAt.toISOString(),
    p_description: expense.description ?? null,
    p_note: expense.note ?? null,
    p_place: expense.place ?? null,
    p_mood: expense.mood ?? null,
    p_person_ids: expense.personIds ?? [],
    p_new_people: expense.newPeople ?? [],
  })
  if (error) return { ok: false }

  revalidatePath("/", "layout")
  return { ok: true }
}

export async function createExpense(input: ExpenseInput & { id: string }): Promise<ActionResult> {
  return saveExpense(input)
}

export async function updateExpense(input: ExpenseInput & { id: string }): Promise<ActionResult> {
  return saveExpense(input)
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

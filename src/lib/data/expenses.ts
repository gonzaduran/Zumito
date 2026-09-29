import "server-only"

import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

export type ExpenseSummary = {
  todayCents: number
  weekCents: number
  monthCents: number
  totalCents: number
}

/** Totales de hoy, esta semana, este mes y siempre, en la zona horaria del usuario. */
export const getExpenseSummary = cache(async (): Promise<ExpenseSummary> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("expense_summary")
  if (error) throw error
  const row = data[0]
  return {
    todayCents: row?.today_cents ?? 0,
    weekCents: row?.week_cents ?? 0,
    monthCents: row?.month_cents ?? 0,
    totalCents: row?.total_cents ?? 0,
  }
})

/** Últimos gastos, del más reciente al más antiguo. */
export const getRecentExpenses = cache(async (limit: number = 5) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("expenses")
    .select("id, amount_cents, description, spent_at, category:categories(name, emoji)")
    .order("spent_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
})

/** Categoría del último gasto apuntado: es la que se preselecciona al añadir otro. */
export const getLastUsedCategoryId = cache(async (): Promise<string | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("expenses")
    .select("category_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.category_id ?? null
})

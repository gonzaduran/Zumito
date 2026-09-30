import "server-only"

import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

/** Apunta los ingresos programados que ya tocan (idempotente). Una vez por petición. */
export const applyRecurringIncomes = cache(async () => {
  const supabase = await createClient()
  await supabase.rpc("apply_recurring_incomes")
})

/** Total ingresado entre dos días (`to` excluido), en la zona del usuario. */
export const getIncomeTotal = cache(async (from: string, to: string) => {
  await applyRecurringIncomes()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("income_total", { p_from: from, p_to: to })
  if (error) throw error
  return Number(data ?? 0)
})

/**
 * Ingresos alrededor de un periodo (un día de margen por la zona horaria): quien llama
 * filtra por el día del usuario.
 */
export const getIncomesAround = cache(async (from: string, to: string) => {
  await applyRecurringIncomes()
  const supabase = await createClient()
  const start = new Date(`${from}T00:00:00Z`)
  start.setUTCDate(start.getUTCDate() - 1)
  const end = new Date(`${to}T00:00:00Z`)
  end.setUTCDate(end.getUTCDate() + 1)
  const { data, error } = await supabase
    .from("incomes")
    .select("id, description, amount_cents, received_at, recurring_id")
    .gte("received_at", start.toISOString())
    .lt("received_at", end.toISOString())
    .order("received_at", { ascending: false })
  if (error) throw error
  return data
})

export const getRecurringIncomes = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("recurring_incomes")
    .select("id, description, amount_cents, day_of_month, active")
    .order("created_at")
  if (error) throw error
  return data
})

import "server-only"

import { cache } from "react"

import { createClient } from "@/lib/supabase/server"
import type { NamedOption } from "@/lib/suggestions"

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

export type HistoryFilters = {
  query?: string
  accountId?: string
  categoryId?: string
  placeId?: string
  personId?: string
  minCents?: number
  maxCents?: number
  limit: number
}

/** Historial filtrado. Pide uno más del límite para saber si hay más resultados. */
export async function searchExpenses(filters: HistoryFilters) {
  const { query, accountId, categoryId, placeId, personId, minCents, maxCents, limit } = filters
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("search_expenses", {
    p_query: query || null,
    p_category_id: categoryId || null,
    p_place_id: placeId || null,
    p_person_id: personId || null,
    p_min_cents: minCents ?? null,
    p_max_cents: maxCents ?? null,
    p_limit: limit + 1,
    p_account_id: accountId || null,
  })
  if (error) throw error
  return { rows: data.slice(0, limit), hasMore: data.length > limit }
}

/** Gasto por categoría entre dos días locales (from incluido, to excluido). */
export const getSpendingByCategory = cache(async (from: string, to: string, accountId?: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("spending_by_category", {
    p_from: from,
    p_to: to,
    p_account_id: accountId || null,
  })
  if (error) throw error
  return data
})

/** Total de cada uno de los últimos meses, incluido el actual. */
export const getSpendingByMonth = cache(async (months: number = 6, accountId?: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("spending_by_month", {
    p_months: months,
    p_account_id: accountId || null,
  })
  if (error) throw error
  return data
})

/** Presupuestos con lo gastado este mes (el total primero). */
export const getBudgetStatus = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("budget_status")
  if (error) throw error
  return data
})

/** Lugares del usuario, de más a menos usados (para autocompletar y filtrar). */
export const getPlaces = cache(async (): Promise<NamedOption[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("places_by_frequency", { p_limit: 200 })
  if (error) throw error
  return data
})

/** Personas del usuario, de más a menos frecuentes. */
export const getPeople = cache(async (): Promise<NamedOption[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("people_by_frequency", { p_limit: 200 })
  if (error) throw error
  return data
})

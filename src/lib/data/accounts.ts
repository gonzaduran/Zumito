import "server-only"

import { cache } from "react"

import { applyRecurringIncomes } from "@/lib/data/incomes"
import { createClient } from "@/lib/supabase/server"

export type Account = { id: string; name: string; emoji: string }

/** Cuentas activas del usuario, en su orden (la primera es la principal). */
export const getAccounts = cache(async (): Promise<Account[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, emoji")
    .is("archived_at", null)
    .order("position")
    .order("created_at")
  if (error) throw error
  return data
})

export type ManagedAccount = Account & { archived: boolean }

/** Todas las cuentas, también las archivadas, para gestionarlas en Ajustes. */
export async function getAllAccounts(): Promise<ManagedAccount[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, emoji, archived_at")
    .order("position")
    .order("created_at")
  if (error) throw error
  return data.map(({ archived_at, ...account }) => ({ ...account, archived: archived_at !== null }))
}

/** Cuenta del último gasto apuntado: es la que se preselecciona al añadir otro. */
export const getLastUsedAccountId = cache(async (): Promise<string | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("expenses")
    .select("account_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.account_id ?? null
})

/** Gastado e ingresado en cada cuenta activa entre dos días (`to` excluido). */
export const getAccountSummary = cache(async (from: string, to: string) => {
  await applyRecurringIncomes()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("account_summary", { p_from: from, p_to: to })
  if (error) throw error
  return data
})

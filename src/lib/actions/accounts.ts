"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getEntitlement } from "@/lib/data/profile"
import { ACCOUNT_LIMITS } from "@/lib/billing/plans"
import { createClient } from "@/lib/supabase/server"
import { accountInputSchema, type AccountInput } from "@/lib/validators/account"
import type { ValidationMessage } from "@/lib/validators/messages"

export type AccountActionResult =
  | { ok: true }
  | { ok: false; error: ValidationMessage | "duplicate" | "premium" | "lastAccount" | "failed" }

/** Nombre repetido: el índice único de nombres activos lo rechaza. */
const UNIQUE_VIOLATION = "23505"

const fail = (code?: string, message?: string): AccountActionResult => {
  if (code === UNIQUE_VIOLATION) return { ok: false, error: "duplicate" }
  if (message?.includes("Límite de cuentas")) return { ok: false, error: "premium" }
  if (message?.includes("al menos una cuenta")) return { ok: false, error: "lastAccount" }
  return { ok: false, error: "failed" }
}

const done = (): AccountActionResult => {
  revalidatePath("/", "layout")
  return { ok: true }
}

const invalid = (error: z.ZodError): AccountActionResult => ({
  ok: false,
  error: (error.issues[0]?.message as ValidationMessage | undefined) ?? "accountNameRequired",
})

/** ¿Cabe otra cuenta activa? Gratis 1, Premium 20 (la base de datos lo vuelve a comprobar). */
async function hasRoomForAnother() {
  const supabase = await createClient()
  const [entitlement, { count }] = await Promise.all([
    getEntitlement(),
    supabase.from("accounts").select("id", { count: "exact", head: true }).is("archived_at", null),
  ])
  const limit = entitlement.premium ? ACCOUNT_LIMITS.premium : ACCOUNT_LIMITS.free
  return (count ?? 0) < limit
}

export async function createAccount(input: AccountInput): Promise<AccountActionResult> {
  const parsed = accountInputSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  if (!(await hasRoomForAnother())) return { ok: false, error: "premium" }

  const supabase = await createClient()
  // Las nuevas van al final.
  const { count } = await supabase.from("accounts").select("id", { count: "exact", head: true })
  const { error } = await supabase.from("accounts").insert({ ...parsed.data, position: count ?? 0 })
  return error ? fail(error.code, error.message) : done()
}

export async function updateAccount(id: string, input: AccountInput): Promise<AccountActionResult> {
  const parsed = accountInputSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  if (!z.uuid().safeParse(id).success) return fail()

  const supabase = await createClient()
  const { error } = await supabase.from("accounts").update(parsed.data).eq("id", id)
  return error ? fail(error.code, error.message) : done()
}

/** Archivar oculta la cuenta para nuevos gastos; sus gastos e ingresos se conservan. */
export async function setAccountArchived(
  id: string,
  archived: boolean,
): Promise<AccountActionResult> {
  if (!z.uuid().safeParse(id).success) return fail()
  if (!archived && !(await hasRoomForAnother())) return { ok: false, error: "premium" }

  const supabase = await createClient()
  const { error } = await supabase
    .from("accounts")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
  return error ? fail(error.code, error.message) : done()
}

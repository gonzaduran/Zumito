"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { defaultTimeZone } from "@/i18n/config"
import { calendarDay } from "@/i18n/format"
import { parseEuros } from "@/lib/amount-input"
import { getCurrentProfile, getEntitlement } from "@/lib/data/profile"
import { createClient } from "@/lib/supabase/server"
import {
  incomeInputSchema,
  recurringIncomeInputSchema,
  type IncomeInput,
} from "@/lib/validators/income"
import type { ValidationMessage } from "@/lib/validators/messages"

export type IncomeActionResult =
  { ok: true } | { ok: false; error: ValidationMessage | "premium" | "failed" }

const firstError = (error: z.ZodError): ValidationMessage =>
  (error.issues[0]?.message as ValidationMessage | undefined) ?? "amountInvalid"

const done = (): IncomeActionResult => {
  revalidatePath("/", "layout")
  return { ok: true }
}

async function userToday() {
  const profile = await getCurrentProfile()
  return calendarDay(new Date(), profile?.timezone ?? defaultTimeZone)
}

/** Momento del ingreso: ahora si es de hoy; si no, a mediodía de ese día. */
async function receivedAt(day: IncomeInput["receivedOn"]) {
  return day === (await userToday()) ? new Date() : new Date(`${day}T12:00:00Z`)
}

export async function addIncome(input: {
  description: string
  amount: string
  receivedOn: string
  accountId?: string
}): Promise<IncomeActionResult> {
  const parsed = incomeInputSchema.safeParse({
    description: input.description,
    amountCents: parseEuros(input.amount) ?? Number.NaN,
    receivedOn: input.receivedOn,
    accountId: input.accountId,
  })
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase.from("incomes").insert({
    description: parsed.data.description,
    amount_cents: parsed.data.amountCents,
    received_at: (await receivedAt(parsed.data.receivedOn)).toISOString(),
    account_id: parsed.data.accountId,
  })
  return error ? { ok: false, error: "failed" } : done()
}

export async function deleteIncome(id: string): Promise<IncomeActionResult> {
  const parsed = z.uuid().safeParse(id)
  if (!parsed.success) return { ok: false, error: "failed" }
  const supabase = await createClient()
  const { error } = await supabase.from("incomes").delete().eq("id", parsed.data)
  return error ? { ok: false, error: "failed" } : done()
}

/**
 * Programa un ingreso y apunta ya los meses que tocan. Gratis: uno; Premium: los que
 * quieras (se comprueba aquí y también en la base de datos).
 */
export async function addRecurringIncome(input: {
  description: string
  amount: string
  dayOfMonth: number
  accountId?: string
}): Promise<IncomeActionResult> {
  const parsed = recurringIncomeInputSchema.safeParse({
    description: input.description,
    amountCents: parseEuros(input.amount) ?? Number.NaN,
    dayOfMonth: input.dayOfMonth,
    accountId: input.accountId,
  })
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  const supabase = await createClient()
  const [entitlement, { count }] = await Promise.all([
    getEntitlement(),
    supabase.from("recurring_incomes").select("id", { count: "exact", head: true }),
  ])
  if (!entitlement.premium && (count ?? 0) >= 1) return { ok: false, error: "premium" }

  const { error } = await supabase.from("recurring_incomes").insert({
    description: parsed.data.description,
    amount_cents: parsed.data.amountCents,
    day_of_month: parsed.data.dayOfMonth,
    account_id: parsed.data.accountId,
  })
  if (error) return { ok: false, error: "failed" }
  await supabase.rpc("apply_recurring_incomes")
  return done()
}

/** Pausar o reanudar. Al reanudar no se apuntan los meses que estuvo en pausa. */
export async function setRecurringIncomeActive(
  id: string,
  active: boolean,
): Promise<IncomeActionResult> {
  const parsed = z.object({ id: z.uuid(), active: z.boolean() }).safeParse({ id, active })
  if (!parsed.success) return { ok: false, error: "failed" }
  const supabase = await createClient()
  const { error } = await supabase
    .from("recurring_incomes")
    .update(parsed.data.active ? { active: true, starts_on: await userToday() } : { active: false })
    .eq("id", parsed.data.id)
  if (error) return { ok: false, error: "failed" }
  if (parsed.data.active) await supabase.rpc("apply_recurring_incomes")
  return done()
}

/** Borra el ingreso programado. Los ingresos que ya apuntó se quedan. */
export async function deleteRecurringIncome(id: string): Promise<IncomeActionResult> {
  const parsed = z.uuid().safeParse(id)
  if (!parsed.success) return { ok: false, error: "failed" }
  const supabase = await createClient()
  const { error } = await supabase.from("recurring_incomes").delete().eq("id", parsed.data)
  return error ? { ok: false, error: "failed" } : done()
}

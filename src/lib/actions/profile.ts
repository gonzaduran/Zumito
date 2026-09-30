"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getBillingConfig, getStripe } from "@/lib/billing/config"
import { createClient } from "@/lib/supabase/server"

const displayNameSchema = z
  .string()
  .trim()
  .max(40)
  .transform((value) => value || null)

export async function updateDisplayName(name: string): Promise<{ ok: boolean }> {
  const parsed = displayNameSchema.safeParse(name)
  if (!parsed.success) return { ok: false }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims.sub
  if (!userId) return { ok: false }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data })
    .eq("id", userId)
  if (error) return { ok: false }

  revalidatePath("/", "layout")
  return { ok: true }
}

/** Borra la cuenta y todos sus datos. No se puede deshacer. Para usar con useActionState. */
export async function deleteAccount(): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  // Antes de borrar, se cancela la suscripción para que no se le vuelva a cobrar.
  // Si no se puede cancelar, no se borra nada.
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .maybeSingle()
  const subscriptionId = subscription?.stripe_subscription_id
  if (subscriptionId && subscription.status !== "canceled") {
    const config = getBillingConfig()
    if (!config) return { ok: false }
    try {
      await getStripe(config).subscriptions.cancel(subscriptionId)
    } catch {
      return { ok: false }
    }
  }
  const { error } = await supabase.rpc("delete_my_account")
  if (error) return { ok: false }
  await supabase.auth.signOut()
  redirect("/login")
}

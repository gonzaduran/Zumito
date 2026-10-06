"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getCurrentUser } from "@/lib/data/profile"
import { createClient } from "@/lib/supabase/server"
import type { ValidationMessage } from "@/lib/validators/messages"
import {
  sharedExpenseInputSchema,
  usernameSchema,
  type SharedExpenseInput,
} from "@/lib/validators/social"

export type SocialResult =
  { ok: true } | { ok: false; error: ValidationMessage | "taken" | "failed" }

const UNIQUE_VIOLATION = "23505"

const done = (): SocialResult => {
  revalidatePath("/", "layout")
  return { ok: true }
}

export async function updateUsername(username: string): Promise<SocialResult> {
  const parsed = usernameSchema.safeParse(username)
  if (!parsed.success) return { ok: false, error: "usernameInvalid" }
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "failed" }
  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ username: parsed.data })
    .eq("id", user.sub)
  if (error) return { ok: false, error: error.code === UNIQUE_VIOLATION ? "taken" : "failed" }
  return done()
}

/** Guarda (o quita) la foto ya subida al bucket. Solo se admite tu propia carpeta. */
export async function setAvatar(path: string | null): Promise<SocialResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "failed" }
  if (path !== null && !new RegExp(`^${user.sub}/[A-Za-z0-9_.-]{1,80}$`).test(path)) {
    return { ok: false, error: "failed" }
  }
  const supabase = await createClient()
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.sub)
  return error ? { ok: false, error: "failed" } : done()
}

export async function searchUsers(query: string) {
  const parsed = z.string().trim().min(3).max(21).safeParse(query.replace(/^@/, ""))
  if (!parsed.success) return []
  const supabase = await createClient()
  const { data } = await supabase.rpc("search_users", { p_query: parsed.data })
  return data ?? []
}

export async function sendFriendRequest(userId: string): Promise<SocialResult> {
  if (!z.uuid().safeParse(userId).success) return { ok: false, error: "failed" }
  const supabase = await createClient()
  const { error } = await supabase.rpc("send_friend_request", { p_user_id: userId })
  return error ? { ok: false, error: "failed" } : done()
}

export async function acceptFriendRequest(userId: string): Promise<SocialResult> {
  if (!z.uuid().safeParse(userId).success) return { ok: false, error: "failed" }
  const supabase = await createClient()
  const { error } = await supabase.rpc("accept_friend_request", { p_user_id: userId })
  return error ? { ok: false, error: "failed" } : done()
}

/** Rechazar, cancelar o dejar de ser amigos: borra la relación (la que haya). */
export async function removeFriend(userId: string): Promise<SocialResult> {
  const user = await getCurrentUser()
  if (!user || !z.uuid().safeParse(userId).success) return { ok: false, error: "failed" }
  const supabase = await createClient()
  const { error } = await supabase
    .from("friendships")
    .delete()
    .or(
      `and(requester_id.eq.${user.sub},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.sub})`,
    )
  return error ? { ok: false, error: "failed" } : done()
}

export async function settleUp(friendId: string): Promise<SocialResult> {
  if (!z.uuid().safeParse(friendId).success) return { ok: false, error: "failed" }
  const supabase = await createClient()
  const { error } = await supabase.rpc("settle_up", { p_friend_id: friendId })
  return error ? { ok: false, error: "failed" } : done()
}

export async function createSharedExpense(input: SharedExpenseInput): Promise<SocialResult> {
  const parsed = sharedExpenseInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: (parsed.error.issues[0]?.message as ValidationMessage | undefined) ?? "failed",
    }
  }
  const expense = parsed.data
  const supabase = await createClient()
  const { error } = await supabase.rpc("create_shared_expense", {
    p_id: expense.id,
    p_description: expense.description ?? null,
    p_amount_cents: expense.amountCents,
    p_spent_at: expense.spentAt.toISOString(),
    p_category_id: expense.categoryId,
    p_account_id: expense.accountId ?? null,
    p_payer_id: expense.payerId,
    p_shares: expense.shares.map((share) => ({
      user_id: share.userId,
      share_cents: share.shareCents,
    })),
  })
  return error ? { ok: false, error: "failed" } : done()
}

/** Solo quien lo creó: desaparece para todos los participantes. */
export async function deleteSharedExpense(id: string): Promise<SocialResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "failed" }
  const supabase = await createClient()
  const { error } = await supabase.rpc("delete_shared_expense", { p_id: id })
  return error ? { ok: false, error: "failed" } : done()
}

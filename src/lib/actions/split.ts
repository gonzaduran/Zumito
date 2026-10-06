"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { splitInputSchema, type SplitBucketInput } from "@/lib/validators/split"
import type { ValidationMessage } from "@/lib/validators/messages"

export type SplitResult =
  { ok: true } | { ok: false; error: ValidationMessage | "premium" | "failed" }

/** Guarda el reparto entero de un ingreso programado (lista vacía = quitarlo). */
export async function saveSplit(
  recurringId: string,
  buckets: SplitBucketInput[],
): Promise<SplitResult> {
  const parsed = splitInputSchema.safeParse(buckets)
  if (!z.uuid().safeParse(recurringId).success) return { ok: false, error: "failed" }
  if (!parsed.success) {
    return {
      ok: false,
      error: (parsed.error.issues[0]?.message as ValidationMessage | undefined) ?? "failed",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("save_split", {
    p_recurring_id: recurringId,
    p_buckets: parsed.data.map((bucket) => ({
      name: bucket.name,
      emoji: bucket.emoji,
      percent: bucket.percent,
      category_ids: bucket.categoryIds,
    })),
  })
  if (error) return { ok: false, error: error.message.includes("Premium") ? "premium" : "failed" }
  revalidatePath("/", "layout")
  return { ok: true }
}

"use server"

import { headers } from "next/headers"

import { createClient } from "@/lib/supabase/server"
import { feedbackInputSchema, type FeedbackInput } from "@/lib/validators/feedback"
import type { ValidationMessage } from "@/lib/validators/messages"

export type FeedbackResult =
  { ok: true } | { ok: false; error: ValidationMessage | "tooMany" | "failed" }

/** Guarda un fallo o una idea. Se leen en Supabase (tabla feedback). */
export async function sendFeedback(input: FeedbackInput): Promise<FeedbackResult> {
  const parsed = feedbackInputSchema.safeParse(input)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message
    return {
      ok: false,
      error: message === "feedbackTooLong" || message === "feedbackTooShort" ? message : "failed",
    }
  }

  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null
  const supabase = await createClient()
  const { error } = await supabase
    .from("feedback")
    .insert({ kind: parsed.data.kind, message: parsed.data.message, user_agent: userAgent })
  if (error) return { ok: false, error: error.code === "54000" ? "tooMany" : "failed" }
  return { ok: true }
}

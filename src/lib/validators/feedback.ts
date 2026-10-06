import { z } from "zod"

import { msg } from "./messages"

export const feedbackKinds = ["bug", "idea", "other"] as const
export type FeedbackKind = (typeof feedbackKinds)[number]

export const feedbackInputSchema = z.object({
  kind: z.enum(feedbackKinds),
  message: z.string().trim().min(3, msg("feedbackTooShort")).max(2000, msg("feedbackTooLong")),
})

export type FeedbackInput = z.infer<typeof feedbackInputSchema>

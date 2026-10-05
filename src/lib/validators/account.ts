import { z } from "zod"

import { isSingleEmoji } from "./category"
import { msg } from "./messages"

export const accountInputSchema = z.object({
  name: z.string().trim().min(1, msg("accountNameRequired")).max(30, msg("accountNameTooLong")),
  emoji: z.string().trim().max(16, msg("emojiInvalid")).refine(isSingleEmoji, msg("emojiInvalid")),
})

export type AccountInput = z.infer<typeof accountInputSchema>

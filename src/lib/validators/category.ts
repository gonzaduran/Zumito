import { z } from "zod"

import { categoryColors } from "@/lib/category-colors"

import { msg } from "./messages"

const graphemes = new Intl.Segmenter("es", { granularity: "grapheme" })

/** Un único emoji (admite secuencias compuestas como 👨‍👩‍👧 o banderas). */
function isSingleEmoji(value: string): boolean {
  return (
    [...graphemes.segment(value)].length === 1 &&
    /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(value)
  )
}

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, msg("categoryNameRequired")).max(30, msg("categoryNameTooLong")),
  emoji: z.string().trim().max(16, msg("emojiInvalid")).refine(isSingleEmoji, msg("emojiInvalid")),
  color: z.enum(categoryColors, msg("colorInvalid")),
})

export type CategoryInput = z.infer<typeof categoryInputSchema>

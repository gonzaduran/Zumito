import { z } from "zod"

import { isSingleEmoji } from "./category"
import { msg } from "./messages"

/** Como mucho 10 partes por reparto (igual que en la base de datos). */
export const MAX_SPLIT_BUCKETS = 10

export const splitBucketSchema = z.object({
  name: z.string().trim().min(1, msg("splitNameRequired")).max(30, msg("splitNameTooLong")),
  emoji: z.string().trim().max(16, msg("emojiInvalid")).refine(isSingleEmoji, msg("emojiInvalid")),
  percent: z
    .int(msg("splitPercentInvalid"))
    .min(1, msg("splitPercentInvalid"))
    .max(100, msg("splitPercentInvalid")),
  categoryIds: z.array(z.uuid()).max(100),
})

export const splitInputSchema = z
  .array(splitBucketSchema)
  .max(MAX_SPLIT_BUCKETS)
  .refine((buckets) => buckets.reduce((sum, bucket) => sum + bucket.percent, 0) <= 100, {
    message: msg("splitOver"),
  })
  .refine(
    (buckets) => {
      const ids = buckets.flatMap((bucket) => bucket.categoryIds)
      return new Set(ids).size === ids.length
    },
    { message: msg("splitCategoryTwice") },
  )

export type SplitBucketInput = z.infer<typeof splitBucketSchema>

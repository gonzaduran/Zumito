import { z } from "zod"

import { defaultCategoryKeys } from "@/lib/default-categories"

import { msg } from "./messages"

export const onboardingInputSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(40, msg("textTooLong"))
    .transform((value) => value || null),
  categories: z
    .array(z.enum(defaultCategoryKeys))
    .min(1, msg("categoriesRequired"))
    .transform((keys) => [...new Set(keys)]),
})

export type OnboardingInput = z.infer<typeof onboardingInputSchema>

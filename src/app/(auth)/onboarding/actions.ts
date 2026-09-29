"use server"

import { redirect } from "next/navigation"

import { getDictionary, type Dictionary } from "@/i18n/get-dictionary"
import { defaultCategories } from "@/lib/default-categories"
import { createClient } from "@/lib/supabase/server"
import { onboardingInputSchema } from "@/lib/validators/onboarding"

export type OnboardingState = { error: keyof Dictionary["onboarding"]["errors"] | null }

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = onboardingInputSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    categories: formData.getAll("categories"),
  })
  if (!parsed.success) return { error: "noCategories" }

  const dict = await getDictionary()
  const selected = new Set(parsed.data.categories)
  // Se guardan en el orden sugerido, no en el orden en que se marcaron.
  const categories = defaultCategories
    .filter((category) => selected.has(category.key))
    .map(({ key, emoji, color }) => ({ name: dict.onboarding.categories[key], emoji, color }))

  const supabase = await createClient()
  const { error } = await supabase.rpc("complete_onboarding", {
    p_display_name: parsed.data.displayName,
    p_categories: categories,
  })
  if (error) return { error: "saveFailed" }

  redirect("/")
}

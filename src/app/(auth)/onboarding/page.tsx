import { redirect } from "next/navigation"

import { OnboardingForm } from "@/components/forms/onboarding-form"
import { getDictionary } from "@/i18n/get-dictionary"
import { getCurrentProfile } from "@/lib/data/profile"

export default async function OnboardingPage() {
  const [dict, profile] = await Promise.all([getDictionary(), getCurrentProfile()])

  if (!profile) redirect("/login")
  if (profile.onboarded_at) redirect("/")

  return <OnboardingForm labels={dict.onboarding} />
}

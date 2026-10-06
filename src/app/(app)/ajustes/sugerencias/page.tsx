import { FeedbackForm } from "@/components/community/feedback-form"
import { AppHeader } from "@/components/layout/app-header"
import { getDictionary } from "@/i18n/get-dictionary"
import { feedbackKinds, type FeedbackKind } from "@/lib/validators/feedback"

export default async function FeedbackPage({ searchParams }: PageProps<"/ajustes/sugerencias">) {
  const [dict, params] = await Promise.all([getDictionary(), searchParams])
  const labels = dict.feedback
  // ?tipo=bug abre directamente "Un fallo".
  const kind = feedbackKinds.find((option) => option === params.tipo) as FeedbackKind | undefined

  return (
    <>
      <AppHeader title={labels.title} back={{ href: "/ajustes", label: labels.back }} />
      <div className="flex flex-col gap-6 px-6 pt-2 pb-8">
        <p className="text-sm text-muted-foreground">{labels.intro}</p>
        <FeedbackForm labels={labels} validation={dict.validation} initialKind={kind} />
      </div>
    </>
  )
}

import { InstallGuide } from "@/components/install/install-guide"
import { AppHeader } from "@/components/layout/app-header"
import { getDictionary } from "@/i18n/get-dictionary"
import { appOrigin } from "@/lib/app-origin"

export default async function InstallPage() {
  const [dict, { host }] = await Promise.all([getDictionary(), appOrigin()])
  const labels = dict.installGuide

  return (
    <>
      <AppHeader title={labels.title} back={{ href: "/ajustes", label: labels.back }} />
      <div className="flex flex-col gap-6 px-6 pt-2 pb-8">
        <p className="text-sm text-muted-foreground">{labels.intro}</p>
        <InstallGuide labels={labels} host={host} />
      </div>
    </>
  )
}

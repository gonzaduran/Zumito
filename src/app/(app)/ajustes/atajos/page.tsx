import { ShortcutsGuide } from "@/components/install/shortcuts-guide"
import { AppHeader } from "@/components/layout/app-header"
import { getDictionary } from "@/i18n/get-dictionary"
import { appOrigin } from "@/lib/app-origin"
import { getCategories } from "@/lib/data/categories"
import { IOS_SHORTCUT_ICLOUD_URL, shortcutLinks } from "@/lib/shortcuts"

export default async function ShortcutsPage() {
  const [dict, { origin }, categories] = await Promise.all([
    getDictionary(),
    appOrigin(),
    getCategories(),
  ])
  const labels = dict.shortcuts

  return (
    <>
      <AppHeader title={labels.title} back={{ href: "/ajustes", label: labels.back }} />
      <div className="flex flex-col gap-6 px-6 pt-2 pb-8">
        <p className="text-sm text-muted-foreground">{labels.intro}</p>
        <ShortcutsGuide
          labels={labels}
          links={shortcutLinks(origin, categories[0]?.name)}
          readyMadeUrl={IOS_SHORTCUT_ICLOUD_URL}
        />
      </div>
    </>
  )
}

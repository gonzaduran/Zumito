import { AppHeader } from "@/components/layout/app-header"
import { CategoryManager } from "@/components/settings/category-manager"
import { getDictionary } from "@/i18n/get-dictionary"
import { getAllCategories } from "@/lib/data/categories"

export default async function CategoriesPage() {
  const [dict, categories] = await Promise.all([getDictionary(), getAllCategories()])
  const labels = dict.categories

  return (
    <>
      <AppHeader title={labels.title} back={{ href: "/ajustes", label: labels.back }} />
      <div className="flex flex-col gap-4 px-6 pt-2 pb-8">
        <p className="text-sm text-muted-foreground">{labels.intro}</p>
        <CategoryManager
          categories={categories}
          labels={labels}
          emojiLabels={dict.emojiPicker}
          colorNames={dict.categoryColors}
          validation={dict.validation}
          closeLabel={dict.common.close}
        />
      </div>
    </>
  )
}

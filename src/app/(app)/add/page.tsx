import { AddExpenseScreen } from "@/components/expenses/add-expense-screen"
import { AppHeader } from "@/components/layout/app-header"
import { getDictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { getCategories } from "@/lib/data/categories"
import { getLastUsedCategoryId, getPeople, getPlaces } from "@/lib/data/expenses"
import { parseQuickAddParams } from "@/lib/quick-add-params"

/**
 * Añadir un gasto desde un enlace o un atajo:
 * /add?categoria=Cafés&importe=3,50&descripcion=Café&lugar=Bar
 */
export default async function AddPage({ searchParams }: PageProps<"/add">) {
  const [params, dict, categories, places, people, lastUsedCategoryId] = await Promise.all([
    searchParams,
    getDictionary(),
    getCategories(),
    getPlaces(),
    getPeople(),
    getLastUsedCategoryId(),
  ])
  const labels = dict.addExpense
  const prefill = parseQuickAddParams(params, categories)

  const notices = [
    prefill.unknownCategory !== undefined
      ? interpolate(labels.unknownCategory, { name: prefill.unknownCategory })
      : null,
    prefill.invalid.includes("importe") ? labels.invalidAmount : null,
  ].filter((notice): notice is string => notice !== null)

  const defaultCategoryId =
    categories.find((c) => c.id === lastUsedCategoryId)?.id ?? categories[0]?.id ?? ""

  return (
    <>
      <AppHeader title={labels.title} back={{ href: "/", label: labels.backHome }} />
      <AddExpenseScreen
        labels={labels}
        offlineLabels={dict.offline}
        categories={categories}
        places={places}
        people={people}
        defaultCategoryId={defaultCategoryId}
        prefill={prefill}
        notices={notices}
      />
    </>
  )
}

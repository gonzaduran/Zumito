import { QuickPick } from "@/components/expenses/quick-pick"
import { AppHeader } from "@/components/layout/app-header"
import { getDictionary } from "@/i18n/get-dictionary"
import { getCategories } from "@/lib/data/categories"
import { parseQuickAddParams } from "@/lib/quick-add-params"

/**
 * Destino de los atajos del móvil: /apuntar?importe=12,5 enseña las categorías de quien
 * lo abre y guarda el gasto al tocar una. Sin importe, abre el formulario.
 */
export default async function QuickPickPage({ searchParams }: PageProps<"/apuntar">) {
  const [params, dict, categories] = await Promise.all([
    searchParams,
    getDictionary(),
    getCategories(),
  ])
  const { amountCents } = parseQuickAddParams({ importe: params.importe }, categories)

  return (
    <>
      <AppHeader
        title={dict.quickPick.header}
        back={{ href: "/", label: dict.addExpense.backHome }}
      />
      <QuickPick
        labels={dict.quickPick}
        addLabels={dict.addExpense}
        offlineLabels={dict.offline}
        categories={categories}
        amountCents={amountCents}
      />
    </>
  )
}

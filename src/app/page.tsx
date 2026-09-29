import { connection } from "next/server"

import { formatCurrency, formatDate } from "@/i18n/format"
import { getDictionary } from "@/i18n/get-dictionary"

export default async function Home() {
  await connection()
  const dict = await getDictionary()

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-2 px-6 py-12">
      <p className="text-sm text-muted-foreground">{formatDate(new Date())}</p>
      <h1 className="text-sm font-medium text-muted-foreground">{dict.home.todayTotal}</h1>
      <p className="text-5xl font-semibold tracking-tight tabular-nums">{formatCurrency(0)}</p>
      <p className="mt-8 text-muted-foreground">{dict.home.emptyToday}</p>
    </main>
  )
}

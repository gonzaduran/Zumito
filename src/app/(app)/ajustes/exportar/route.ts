import { defaultTimeZone } from "@/i18n/config"
import { calendarDay, formatDate, formatTime } from "@/i18n/format"
import { getDictionary } from "@/i18n/get-dictionary"
import { toCsv } from "@/lib/csv"
import { getCurrentProfile } from "@/lib/data/profile"
import { moods } from "@/lib/validators/expense"
import { createClient } from "@/lib/supabase/server"

const PAGE_SIZE = 1000

/** Descarga todos los gastos del usuario en CSV. */
export async function GET() {
  const [dict, profile, supabase] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    createClient(),
  ])
  if (!profile) return new Response(null, { status: 401 })
  const timeZone = profile.timezone ?? defaultTimeZone
  const labels = dict.export

  const rows: string[][] = [
    [
      labels.date,
      labels.time,
      labels.amount,
      labels.category,
      labels.description,
      labels.place,
      labels.people,
      labels.mood,
      labels.note,
    ],
  ]
  // Por páginas: PostgREST limita el número de filas por petición.
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("expenses")
      .select(
        "amount_cents, description, note, spent_at, mood, category:categories(name), place:places(name), expense_people(person:people(name))",
      )
      .order("spent_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (error) return new Response(null, { status: 500 })
    for (const expense of data) {
      const date = new Date(expense.spent_at)
      rows.push([
        formatDate(date, { timeZone }),
        formatTime(date, { timeZone }),
        // Número sin símbolo de moneda para poder sumarlo en la hoja de cálculo.
        (expense.amount_cents / 100).toFixed(2).replace(".", ","),
        expense.category?.name ?? "",
        expense.description ?? "",
        expense.place?.name ?? "",
        expense.expense_people
          .map((link) => link.person?.name)
          .filter(Boolean)
          .join(", "),
        (moods as readonly string[]).includes(expense.mood ?? "")
          ? dict.addExpense.moods[expense.mood as (typeof moods)[number]]
          : "",
        expense.note ?? "",
      ])
    }
    if (data.length < PAGE_SIZE) break
  }

  const fileName = `${labels.fileName}-${calendarDay(new Date(), timeZone)}.csv`
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  })
}

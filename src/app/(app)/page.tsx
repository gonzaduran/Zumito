import { connection } from "next/server"

import { CategoryBreakdown } from "@/components/home/category-breakdown"
import { RecentExpenses } from "@/components/home/recent-expenses"
import { SpendingHeroCard, type PeriodSummary } from "@/components/home/spending-hero-card"
import { AppHeader } from "@/components/layout/app-header"
import { ProfileButton } from "@/components/layout/profile-button"
import { formatCurrency, formatMonth } from "@/i18n/format"
import { getDictionary } from "@/i18n/get-dictionary"

export default async function HomePage() {
  await connection()
  const dict = await getDictionary()

  // Sin datos todavía: los componentes se conectarán a Supabase en fases posteriores.
  const empty: PeriodSummary = { amount: formatCurrency(0), delta: null }

  return (
    <>
      <AppHeader
        eyebrow={dict.common.greeting}
        title={formatMonth(new Date())}
        action={<ProfileButton label={dict.common.profile} />}
      />
      <div className="flex flex-col gap-7 px-6 pt-4">
        <SpendingHeroCard
          labels={dict.home}
          summaries={{ today: empty, week: empty, month: empty, total: empty }}
        />
        <CategoryBreakdown
          title={dict.home.categoriesTitle}
          seeAll={{ href: "/estadisticas", label: dict.home.seeAll }}
          items={[]}
        />
        <RecentExpenses
          title={dict.home.recentTitle}
          historyLink={{ href: "/historial", label: dict.home.historyLink }}
          empty={{ title: dict.home.emptyTitle, description: dict.home.emptyDescription }}
          items={[]}
        />
      </div>
    </>
  )
}

import { AppHeader } from "@/components/layout/app-header"
import { PlansView } from "@/components/plans/plans-view"
import { defaultTimeZone } from "@/i18n/config"
import { formatCents, formatLongDate, formatPercent } from "@/i18n/format"
import { getDictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { getBillingConfig } from "@/lib/billing/config"
import {
  PREMIUM_PRICES,
  TRIAL_DAYS,
  WELCOME_DISCOUNT_PERCENT,
  WELCOME_YEAR_PRICE,
  YEARLY_SAVING_PERCENT,
  welcomeOfferRemainingMs,
  type Entitlement,
} from "@/lib/billing/plans"
import { getCurrentProfile, getEntitlement } from "@/lib/data/profile"
import { createClient } from "@/lib/supabase/server"

function statusMessage(
  entitlement: Entitlement,
  labels: Awaited<ReturnType<typeof getDictionary>>["plans"]["status"],
  timeZone: string,
): string | null {
  const date = (iso: string | null) => (iso ? formatLongDate(new Date(iso), { timeZone }) : "")
  if (entitlement.source === "founder") return labels.founder
  if (!entitlement.premium) return null
  if (entitlement.status === "past_due") return labels.pastDue
  if (entitlement.cancelAtPeriodEnd) {
    return interpolate(labels.canceling, { date: date(entitlement.periodEnd) })
  }
  if (entitlement.status === "trialing") {
    return interpolate(labels.trialing, { date: date(entitlement.trialEnd) })
  }
  return interpolate(labels.active, { date: date(entitlement.periodEnd) })
}

export default async function PlansPage({ searchParams }: PageProps<"/planes">) {
  const [dict, profile, entitlement, params] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    getEntitlement(),
    searchParams,
  ])
  const labels = dict.plans
  const timeZone = profile?.timezone ?? defaultTimeZone
  const paymentsEnabled = getBillingConfig() !== null

  // La oferta de bienvenida empieza la primera vez que se ve esta pantalla (solo una vez).
  let offerRemainingMs = 0
  if (paymentsEnabled && !entitlement.premium) {
    const supabase = await createClient()
    const { data: startedAt } = await supabase.rpc("start_welcome_offer")
    offerRemainingMs = welcomeOfferRemainingMs(startedAt ?? null)
  }

  const firstCharge = new Date()
  firstCharge.setDate(firstCharge.getDate() + TRIAL_DAYS)

  return (
    <>
      <AppHeader title={labels.title} back={{ href: "/ajustes", label: dict.budgets.back }} />
      <div className="px-6 pt-2 pb-8">
        <PlansView
          labels={labels}
          prices={{
            month: formatCents(PREMIUM_PRICES.month),
            year: formatCents(PREMIUM_PRICES.year),
            yearMonthly: formatCents(Math.floor(PREMIUM_PRICES.year / 12)),
            welcomeYear: formatCents(WELCOME_YEAR_PRICE),
            savePercent: formatPercent(YEARLY_SAVING_PERCENT),
            discountPercent: formatPercent(WELCOME_DISCOUNT_PERCENT),
          }}
          premium={entitlement.premium}
          statusMessage={statusMessage(entitlement, labels.status, timeZone)}
          canManage={entitlement.source === "stripe" && paymentsEnabled}
          trialAvailable={entitlement.trialAvailable}
          firstChargeDate={formatLongDate(firstCharge, { timeZone })}
          paymentsEnabled={paymentsEnabled}
          offerRemainingMs={offerRemainingMs}
          success={params.estado === "ok"}
          showContinueFree={params.bienvenida === "1"}
        />
      </div>
    </>
  )
}

/**
 * Planes, precios y reglas de acceso a Premium. Lógica pura (se prueba sin Stripe).
 * Los importes deben coincidir con los precios creados en Stripe (scripts/stripe-setup.mjs).
 */

export const TRIAL_DAYS = 7
export const WELCOME_OFFER_MINUTES = 5
export const WELCOME_DISCOUNT_PERCENT = 10

export type BillingInterval = "month" | "year"

/** Precios de Premium en céntimos, IVA incluido. */
export const PREMIUM_PRICES: Record<BillingInterval, number> = { month: 149, year: 999 }

/** Precio del primer año con la oferta de bienvenida (solo plan anual): 8,99 €. */
export const WELCOME_YEAR_PRICE = Math.round(
  PREMIUM_PRICES.year * (1 - WELCOME_DISCOUNT_PERCENT / 100),
)

/** Lo que cuesta un año pagando cada mes: 17,88 €. */
const TWELVE_MONTHS = PREMIUM_PRICES.month * 12

/**
 * Ahorro en euros frente a pagar cada mes durante un año (se entiende antes que un %):
 * 7,89 € con el anual y 8,89 € el primer año con la oferta de bienvenida.
 */
export const YEARLY_SAVING_CENTS = TWELVE_MONTHS - PREMIUM_PRICES.year
export const WELCOME_SAVING_CENTS = TWELVE_MONTHS - WELCOME_YEAR_PRICE

/** Cuentas activas (Personal, Padres…): Gratis 1; Premium 20 (tope técnico). Igual en la base de datos. */
export const ACCOUNT_LIMITS = { free: 1, premium: 20 } as const

/** Estados de Stripe que dan acceso: en prueba, activa y pendiente de cobro (Stripe reintenta). */
const PREMIUM_STATUSES = new Set(["trialing", "active", "past_due"])

export type SubscriptionRow = {
  status: string | null
  billing_interval: string | null
  trial_end: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_used: boolean
}

export type Entitlement = {
  premium: boolean
  /** Por qué es Premium: Fundador (a mano), suscripción de Stripe o beta abierta para todos. */
  source: "founder" | "stripe" | "beta" | null
  status: string | null
  interval: BillingInterval | null
  trialEnd: string | null
  periodEnd: string | null
  cancelAtPeriodEnd: boolean
  /** La prueba gratuita es una vez por persona. */
  trialAvailable: boolean
}

export function resolveEntitlement(
  profile: { premium_comp: boolean } | null,
  subscription: SubscriptionRow | null,
  /** Beta abierta: todos tienen Premium sin pagar (public.app_settings). */
  betaOpen = false,
): Entitlement {
  const fromStripe = Boolean(subscription?.status && PREMIUM_STATUSES.has(subscription.status))
  const founder = Boolean(profile?.premium_comp)
  const interval = subscription?.billing_interval
  return {
    premium: founder || fromStripe || betaOpen,
    source: founder ? "founder" : fromStripe ? "stripe" : betaOpen ? "beta" : null,
    status: subscription?.status ?? null,
    interval: interval === "month" || interval === "year" ? interval : null,
    trialEnd: subscription?.trial_end ?? null,
    periodEnd: subscription?.current_period_end ?? null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    trialAvailable: !subscription?.trial_used,
  }
}

/** Milisegundos que le quedan a la oferta de bienvenida (0 si no ha empezado o terminó). */
export function welcomeOfferRemainingMs(startedAt: string | null, now: Date = new Date()): number {
  if (!startedAt) return 0
  const end = new Date(startedAt).getTime() + WELCOME_OFFER_MINUTES * 60_000
  return Math.max(0, end - now.getTime())
}

/** Datos que guardamos de una suscripción de Stripe (API 2025+: el periodo va en cada línea). */
export type StripeSubscriptionLike = {
  id: string
  status: string
  customer: string | { id: string }
  cancel_at_period_end: boolean
  trial_end: number | null
  items: {
    data: {
      current_period_end: number
      price: { id: string; recurring: { interval: string } | null }
    }[]
  }
}

const toIso = (seconds: number | null | undefined) =>
  seconds ? new Date(seconds * 1000).toISOString() : null

export function subscriptionToRow(subscription: StripeSubscriptionLike) {
  const item = subscription.items.data[0]
  const interval = item?.price.recurring?.interval
  return {
    stripe_customer_id:
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    price_id: item?.price.id ?? null,
    billing_interval: interval === "month" || interval === "year" ? interval : null,
    trial_end: toIso(subscription.trial_end),
    current_period_end: toIso(item?.current_period_end),
    cancel_at_period_end: subscription.cancel_at_period_end,
  }
}

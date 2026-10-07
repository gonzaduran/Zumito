"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { appOrigin } from "@/lib/app-origin"
import { getBillingConfig, getStripe } from "@/lib/billing/config"
import { TRIAL_DAYS, welcomeOfferRemainingMs } from "@/lib/billing/plans"
import { getCurrentUser, getEntitlement } from "@/lib/data/profile"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export type BillingActionResult =
  { url: string } | { error: "notConfigured" | "failed" | "alreadyPremium" }

/**
 * Abre Stripe Checkout para Premium. La primera vez incluye 7 días gratis; al terminar la
 * prueba, Stripe cobra y renueva solo (hasta que el usuario cancele).
 * Devuelve la URL de pago: el cliente navega a ella.
 * El descuento de bienvenida se decide aquí, en el servidor, con la hora del servidor.
 */
export async function startCheckout(interval: "month" | "year"): Promise<BillingActionResult> {
  const parsedInterval = z.enum(["month", "year"]).safeParse(interval)
  const config = getBillingConfig()
  if (!config) return { error: "notConfigured" }
  if (!parsedInterval.success) return { error: "failed" }

  const user = await getCurrentUser()
  if (!user) redirect("/login?next=/planes")
  const entitlement = await getEntitlement()
  if (entitlement.premium) return { error: "alreadyPremium" }

  const stripe = getStripe(config)
  const admin = createAdminClient(config.SUPABASE_SECRET_KEY)
  const supabase = await createClient()
  let url: string | null

  try {
    const [{ data: existing }, { data: profile }] = await Promise.all([
      admin
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.sub)
        .maybeSingle(),
      supabase.from("profiles").select("welcome_offer_started_at").maybeSingle(),
    ])

    // Un cliente de Stripe por usuario: se crea la primera vez y se reutiliza.
    let customerId = existing?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.sub },
      })
      customerId = customer.id
      const { error } = await admin
        .from("subscriptions")
        .upsert({ user_id: user.sub, stripe_customer_id: customerId })
      if (error) throw error
    }

    const withWelcomeOffer =
      parsedInterval.data === "year" &&
      welcomeOfferRemainingMs(profile?.welcome_offer_started_at ?? null) > 0

    const { origin } = await appOrigin()
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.sub,
      locale: "es",
      line_items: [
        {
          price:
            parsedInterval.data === "year"
              ? config.STRIPE_PRICE_PREMIUM_YEARLY
              : config.STRIPE_PRICE_PREMIUM_MONTHLY,
          quantity: 1,
        },
      ],
      // Se pide la tarjeta ya: al acabar la prueba la suscripción se renueva sola.
      payment_method_collection: "always",
      subscription_data: {
        metadata: { user_id: user.sub },
        ...(entitlement.trialAvailable ? { trial_period_days: TRIAL_DAYS } : {}),
      },
      ...(withWelcomeOffer
        ? { discounts: [{ coupon: config.STRIPE_COUPON_WELCOME }] }
        : { allow_promotion_codes: true }),
      success_url: `${origin}/planes?estado=ok`,
      cancel_url: `${origin}/planes`,
    })
    url = session.url
  } catch {
    return { error: "failed" }
  }

  return url ? { url } : { error: "failed" }
}

/** Portal de cliente de Stripe: cambiar tarjeta, ver facturas, cambiar de plan o cancelar. */
export async function openBillingPortal(): Promise<BillingActionResult> {
  const config = getBillingConfig()
  if (!config) return { error: "notConfigured" }
  const user = await getCurrentUser()
  if (!user) redirect("/login?next=/planes")

  let url: string
  try {
    const admin = createAdminClient(config.SUPABASE_SECRET_KEY)
    const { data } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.sub)
      .maybeSingle()
    if (!data) return { error: "failed" }
    const session = await getStripe(config).billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${(await appOrigin()).origin}/planes`,
      locale: "es",
      ...(config.STRIPE_PORTAL_CONFIGURATION
        ? { configuration: config.STRIPE_PORTAL_CONFIGURATION }
        : {}),
    })
    url = session.url
  } catch {
    return { error: "failed" }
  }
  return { url }
}

/** Registra que se ha mostrado la oferta de bienvenida (solo cuenta la primera vez). */
export async function startWelcomeOffer(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("start_welcome_offer")
  return data ?? null
}

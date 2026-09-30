import "server-only"

import Stripe from "stripe"
import { z } from "zod"

/**
 * Configuración de pagos. Solo en el servidor: ninguna de estas claves lleva NEXT_PUBLIC_
 * ni llega nunca al navegador. Si falta algo, los pagos quedan desactivados y la app
 * sigue funcionando (la pantalla de planes lo indica).
 */
const billingEnvSchema = z.object({
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  STRIPE_PRICE_PREMIUM_MONTHLY: z.string().startsWith("price_"),
  STRIPE_PRICE_PREMIUM_YEARLY: z.string().startsWith("price_"),
  STRIPE_COUPON_WELCOME: z.string().min(1),
  /** Configuración del portal de cliente (opcional: si falta, se usa la de por defecto). */
  STRIPE_PORTAL_CONFIGURATION: z.string().startsWith("bpc_").optional(),
  /** Clave secreta de Supabase (sb_secret_… o service_role): solo para el webhook. */
  SUPABASE_SECRET_KEY: z.string().min(20),
})

export type BillingConfig = z.infer<typeof billingEnvSchema>

export function getBillingConfig(): BillingConfig | null {
  const result = billingEnvSchema.safeParse({
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_PREMIUM_MONTHLY: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    STRIPE_PRICE_PREMIUM_YEARLY: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
    STRIPE_COUPON_WELCOME: process.env.STRIPE_COUPON_WELCOME,
    STRIPE_PORTAL_CONFIGURATION: process.env.STRIPE_PORTAL_CONFIGURATION || undefined,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  })
  return result.success ? result.data : null
}

let stripe: Stripe | null = null

export function getStripe(config: BillingConfig): Stripe {
  stripe ??= new Stripe(config.STRIPE_SECRET_KEY, { appInfo: { name: "Zumito" } })
  return stripe
}

// Crea en Stripe lo que necesita Zumito: producto Premium, precios (1,49 €/mes y 9,99 €/año,
// IVA incluido), cupón de bienvenida (-10 % el primer año) y portal de cliente.
// Se puede repetir sin duplicar nada (busca por lookup_key / id).
//
// Uso: STRIPE_SECRET_KEY=sk_test_… npm run stripe:setup
// Al terminar imprime las variables para .env.local y Vercel.
import Stripe from "stripe"

const key = process.env.STRIPE_SECRET_KEY
if (!key?.startsWith("sk_")) {
  console.error("Falta STRIPE_SECRET_KEY (sk_test_… para pruebas).")
  process.exit(1)
}
const stripe = new Stripe(key)

const PRODUCT_ID = "zumito_premium"
const COUPON_ID = "ZUMITO_BIENVENIDA_10"
const PRICES = [
  { lookup: "zumito_premium_monthly", amount: 149, interval: "month" },
  { lookup: "zumito_premium_yearly", amount: 999, interval: "year" },
]

async function ensureProduct() {
  try {
    return await stripe.products.retrieve(PRODUCT_ID)
  } catch {
    return stripe.products.create({
      id: PRODUCT_ID,
      name: "Zumito Premium",
      description: "Presupuestos por categoría y todo lo que llegue a Premium.",
    })
  }
}

async function ensurePrice({ lookup, amount, interval }) {
  const found = await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 1 })
  if (found.data[0]) return found.data[0]
  return stripe.prices.create({
    product: PRODUCT_ID,
    currency: "eur",
    unit_amount: amount,
    tax_behavior: "inclusive",
    recurring: { interval },
    lookup_key: lookup,
  })
}

async function ensureCoupon() {
  try {
    return await stripe.coupons.retrieve(COUPON_ID)
  } catch {
    return stripe.coupons.create({
      id: COUPON_ID,
      name: "Bienvenida -10 %",
      percent_off: 10,
      // Solo la primera factura: el primer año del plan anual.
      duration: "once",
      applies_to: { products: [PRODUCT_ID] },
    })
  }
}

async function createPortal(prices) {
  return stripe.billingPortal.configurations.create({
    business_profile: { headline: "Gestiona tu suscripción a Zumito Premium" },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id"] },
      subscription_cancel: {
        enabled: true,
        // Sigue siendo Premium hasta el final del periodo pagado.
        mode: "at_period_end",
        cancellation_reason: {
          enabled: true,
          options: ["too_expensive", "missing_features", "unused", "other"],
        },
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        proration_behavior: "create_prorations",
        products: [{ product: PRODUCT_ID, prices: prices.map((price) => price.id) }],
      },
    },
  })
}

await ensureProduct()
const [monthly, yearly] = await Promise.all(PRICES.map(ensurePrice))
const coupon = await ensureCoupon()
const portal = await createPortal([monthly, yearly])

console.log(`
Listo. Añade esto a .env.local y a Vercel (solo servidor):

STRIPE_PRICE_PREMIUM_MONTHLY=${monthly.id}
STRIPE_PRICE_PREMIUM_YEARLY=${yearly.id}
STRIPE_COUPON_WELCOME=${coupon.id}
STRIPE_PORTAL_CONFIGURATION=${portal.id}

Falta STRIPE_WEBHOOK_SECRET: crea el webhook en Stripe (Developers > Webhooks) apuntando a
https://TU-DOMINIO/api/stripe/webhook con los eventos:
  checkout.session.completed
  customer.subscription.created, .updated, .deleted, .paused, .resumed, .trial_will_end
En local: stripe listen --forward-to localhost:3000/api/stripe/webhook
`)

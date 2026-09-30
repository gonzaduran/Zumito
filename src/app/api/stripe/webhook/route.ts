import type Stripe from "stripe"

import { getBillingConfig, getStripe } from "@/lib/billing/config"
import { handleWebhookEvent, type WebhookDeps, type WebhookEvent } from "@/lib/billing/webhook"
import { createAdminClient } from "@/lib/supabase/admin"

/** Webhook de Stripe: mantiene al día el plan de cada usuario. */
export async function POST(request: Request) {
  const config = getBillingConfig()
  if (!config) return new Response("Pagos no configurados", { status: 503 })

  const signature = request.headers.get("stripe-signature")
  if (!signature) return new Response("Falta la firma", { status: 400 })

  const stripe = getStripe(config)
  let event: Stripe.Event
  try {
    // Cuerpo sin procesar: la firma se calcula sobre los bytes exactos que envía Stripe.
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      config.STRIPE_WEBHOOK_SECRET,
    )
  } catch {
    return new Response("Firma no válida", { status: 400 })
  }

  const admin = createAdminClient(config.SUPABASE_SECRET_KEY)
  const deps: WebhookDeps = {
    retrieveSubscription: async (id) => stripe.subscriptions.retrieve(id),
    alreadyProcessed: async (id) => {
      const { data } = await admin.from("stripe_events").select("id").eq("id", id).maybeSingle()
      return Boolean(data)
    },
    markProcessed: async (id, type) => {
      await admin.from("stripe_events").upsert({ id, type }, { onConflict: "id" })
    },
    findUserByCustomer: async (customerId) => {
      const { data } = await admin
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle()
      return data?.user_id ?? null
    },
    getTrialUsed: async (userId) => {
      const { data } = await admin
        .from("subscriptions")
        .select("trial_used")
        .eq("user_id", userId)
        .maybeSingle()
      return data?.trial_used ?? false
    },
    saveSubscription: async (userId, row) => {
      const { error } = await admin
        .from("subscriptions")
        .upsert({ user_id: userId, ...row, updated_at: new Date().toISOString() })
      if (error) throw error
    },
  }

  try {
    await handleWebhookEvent(event as unknown as WebhookEvent, deps)
  } catch {
    // 500: Stripe reintentará el evento más tarde.
    return new Response("Error al procesar", { status: 500 })
  }
  return Response.json({ received: true })
}

import { subscriptionToRow, type StripeSubscriptionLike } from "./plans"

/** Lo mínimo que el webhook necesita de Stripe y de la base de datos (inyectable en pruebas). */
export type WebhookDeps = {
  retrieveSubscription: (
    id: string,
  ) => Promise<StripeSubscriptionLike & { metadata: Record<string, string> | null }>
  alreadyProcessed: (eventId: string) => Promise<boolean>
  markProcessed: (eventId: string, type: string) => Promise<void>
  findUserByCustomer: (customerId: string) => Promise<string | null>
  getTrialUsed: (userId: string) => Promise<boolean>
  saveSubscription: (
    userId: string,
    row: ReturnType<typeof subscriptionToRow> & { trial_used: boolean },
  ) => Promise<void>
}

export type WebhookEvent = {
  id: string
  type: string
  data: { object: { id?: string; object?: string; subscription?: unknown } }
}

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.trial_will_end",
])

/** Id de la suscripción afectada por el evento, o `null` si el evento no nos interesa. */
function subscriptionIdOf(event: WebhookEvent): string | null {
  const object = event.data.object
  if (event.type === "checkout.session.completed") {
    return typeof object.subscription === "string" ? object.subscription : null
  }
  if (SUBSCRIPTION_EVENTS.has(event.type) && object.object === "subscription" && object.id) {
    return object.id
  }
  return null
}

/**
 * Procesa un evento ya verificado (firma comprobada antes de llegar aquí).
 * - Idempotente: un evento ya procesado se ignora; y aunque se reprocesara, el resultado
 *   es el mismo, porque siempre se guarda el estado actual pedido a Stripe.
 * - No confía en el orden de los eventos: consulta la suscripción en Stripe.
 */
export async function handleWebhookEvent(
  event: WebhookEvent,
  deps: WebhookDeps,
): Promise<"processed" | "duplicate" | "ignored"> {
  if (await deps.alreadyProcessed(event.id)) return "duplicate"

  const subscriptionId = subscriptionIdOf(event)
  if (!subscriptionId) {
    await deps.markProcessed(event.id, event.type)
    return "ignored"
  }

  const subscription = await deps.retrieveSubscription(subscriptionId)
  const row = subscriptionToRow(subscription)
  const userId =
    subscription.metadata?.user_id || (await deps.findUserByCustomer(row.stripe_customer_id))
  if (!userId) throw new Error(`Suscripción ${subscriptionId} sin usuario`)

  // La prueba es una vez por persona: una vez usada, no se vuelve a ofrecer.
  const trialUsed = (await deps.getTrialUsed(userId)) || row.trial_end !== null
  await deps.saveSubscription(userId, { ...row, trial_used: trialUsed })
  await deps.markProcessed(event.id, event.type)
  return "processed"
}

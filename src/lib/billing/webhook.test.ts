import Stripe from "stripe"
import { describe, expect, it, vi } from "vitest"

import { handleWebhookEvent, type WebhookDeps, type WebhookEvent } from "./webhook"

const subscription = (overrides: Record<string, unknown> = {}) => ({
  id: "sub_1",
  status: "trialing",
  customer: "cus_1",
  cancel_at_period_end: false,
  trial_end: 1_790_000_000,
  metadata: { user_id: "user-1" },
  items: {
    data: [
      {
        current_period_end: 1_790_000_000,
        price: { id: "price_year", recurring: { interval: "year" } },
      },
    ],
  },
  ...overrides,
})

function makeDeps(overrides: Partial<WebhookDeps> = {}) {
  const processed = new Set<string>()
  const saved: unknown[] = []
  const deps: WebhookDeps = {
    retrieveSubscription: vi.fn(async () => subscription()),
    alreadyProcessed: async (id) => processed.has(id),
    markProcessed: async (id) => void processed.add(id),
    findUserByCustomer: async () => null,
    getTrialUsed: async () => false,
    saveSubscription: async (userId, row) => void saved.push({ userId, ...row }),
    ...overrides,
  }
  return { deps, saved, processed }
}

const event = (
  type: string,
  object: WebhookEvent["data"]["object"],
  id = "evt_1",
): WebhookEvent => ({
  id,
  type,
  data: { object },
})

describe("webhook de Stripe", () => {
  it("al completar el pago guarda la suscripción del usuario (estado pedido a Stripe)", async () => {
    const { deps, saved } = makeDeps()
    const result = await handleWebhookEvent(
      event("checkout.session.completed", { object: "checkout.session", subscription: "sub_1" }),
      deps,
    )
    expect(result).toBe("processed")
    expect(deps.retrieveSubscription).toHaveBeenCalledWith("sub_1")
    expect(saved).toEqual([
      expect.objectContaining({ userId: "user-1", status: "trialing", trial_used: true }),
    ])
  })

  it("es idempotente: el mismo evento dos veces se procesa una", async () => {
    const { deps, saved } = makeDeps()
    const e = event("customer.subscription.updated", { object: "subscription", id: "sub_1" })
    expect(await handleWebhookEvent(e, deps)).toBe("processed")
    expect(await handleWebhookEvent(e, deps)).toBe("duplicate")
    expect(saved).toHaveLength(1)
  })

  it("una cancelación deja el estado cancelado (sin Premium)", async () => {
    const { deps, saved } = makeDeps({
      retrieveSubscription: async () => subscription({ status: "canceled", trial_end: null }),
      getTrialUsed: async () => true,
    })
    await handleWebhookEvent(
      event("customer.subscription.deleted", { object: "subscription", id: "sub_1" }),
      deps,
    )
    expect(saved).toEqual([expect.objectContaining({ status: "canceled", trial_used: true })])
  })

  it("si no trae el usuario, lo busca por cliente de Stripe", async () => {
    const { deps, saved } = makeDeps({
      retrieveSubscription: async () => subscription({ metadata: {} }),
      findUserByCustomer: async (customer) => (customer === "cus_1" ? "user-9" : null),
    })
    await handleWebhookEvent(
      event("customer.subscription.created", { object: "subscription", id: "sub_1" }),
      deps,
    )
    expect(saved).toEqual([expect.objectContaining({ userId: "user-9" })])
  })

  it("sin usuario falla (Stripe reintentará) y no marca el evento como procesado", async () => {
    const { deps, processed } = makeDeps({
      retrieveSubscription: async () => subscription({ metadata: {} }),
    })
    await expect(
      handleWebhookEvent(
        event("customer.subscription.created", { object: "subscription", id: "sub_1" }),
        deps,
      ),
    ).rejects.toThrow()
    expect(processed.size).toBe(0)
  })

  it("ignora eventos que no afectan a la suscripción", async () => {
    const { deps, saved } = makeDeps()
    expect(await handleWebhookEvent(event("invoice.created", { object: "invoice" }), deps)).toBe(
      "ignored",
    )
    expect(saved).toHaveLength(0)
  })

  it("la firma de Stripe se verifica: un cuerpo alterado se rechaza", () => {
    const stripe = new Stripe("sk_test_fake")
    const secret = "whsec_test"
    const payload = JSON.stringify({ id: "evt_1", type: "invoice.created", data: { object: {} } })
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret })
    expect(stripe.webhooks.constructEvent(payload, header, secret).id).toBe("evt_1")
    expect(() =>
      stripe.webhooks.constructEvent(payload.replace("evt_1", "evt_2"), header, secret),
    ).toThrow()
    expect(() => stripe.webhooks.constructEvent(payload, header, "whsec_otro")).toThrow()
  })
})

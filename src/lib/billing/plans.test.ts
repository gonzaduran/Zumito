import { describe, expect, it } from "vitest"

import {
  resolveEntitlement,
  subscriptionToRow,
  WELCOME_YEAR_PRICE,
  welcomeOfferRemainingMs,
  YEARLY_SAVING_PERCENT,
  type SubscriptionRow,
} from "./plans"

const sub = (overrides: Partial<SubscriptionRow>): SubscriptionRow => ({
  status: "active",
  billing_interval: "year",
  trial_end: null,
  current_period_end: "2027-10-01T00:00:00.000Z",
  cancel_at_period_end: false,
  trial_used: true,
  ...overrides,
})

describe("acceso a Premium", () => {
  it("sin suscripción: plan gratis y prueba disponible", () => {
    expect(resolveEntitlement({ premium_comp: false }, null)).toMatchObject({
      premium: false,
      source: null,
      trialAvailable: true,
    })
  })

  it.each(["trialing", "active", "past_due"])("con estado %s es Premium", (status) => {
    expect(resolveEntitlement({ premium_comp: false }, sub({ status })).premium).toBe(true)
  })

  it.each(["canceled", "unpaid", "incomplete", "incomplete_expired", "paused", null])(
    "con estado %s no es Premium",
    (status) => {
      expect(resolveEntitlement({ premium_comp: false }, sub({ status })).premium).toBe(false)
    },
  )

  it("Fundadores es Premium sin suscripción", () => {
    expect(resolveEntitlement({ premium_comp: true }, null)).toMatchObject({
      premium: true,
      source: "founder",
    })
  })

  it("quien ya usó la prueba no la repite, aunque haya cancelado", () => {
    expect(
      resolveEntitlement({ premium_comp: false }, sub({ status: "canceled", trial_used: true }))
        .trialAvailable,
    ).toBe(false)
  })
})

describe("oferta de bienvenida", () => {
  const start = "2026-10-01T10:00:00.000Z"

  it("dura 5 minutos desde que se muestra", () => {
    expect(welcomeOfferRemainingMs(start, new Date("2026-10-01T10:00:00Z"))).toBe(300_000)
    expect(welcomeOfferRemainingMs(start, new Date("2026-10-01T10:04:30Z"))).toBe(30_000)
    expect(welcomeOfferRemainingMs(start, new Date("2026-10-01T10:05:01Z"))).toBe(0)
  })

  it("sin empezar no hay oferta", () => {
    expect(welcomeOfferRemainingMs(null)).toBe(0)
  })

  it("precios: 8,99 € el primer año y un 44 % de ahorro en el anual", () => {
    expect(WELCOME_YEAR_PRICE).toBe(899)
    expect(YEARLY_SAVING_PERCENT).toBe(44)
  })
})

describe("suscripción de Stripe a fila", () => {
  it("toma el periodo y el precio de la primera línea", () => {
    expect(
      subscriptionToRow({
        id: "sub_1",
        status: "trialing",
        customer: { id: "cus_1" },
        cancel_at_period_end: false,
        trial_end: 1_790_000_000,
        items: {
          data: [
            {
              current_period_end: 1_790_000_000,
              price: { id: "price_year", recurring: { interval: "year" } },
            },
          ],
        },
      }),
    ).toEqual({
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_1",
      status: "trialing",
      price_id: "price_year",
      billing_interval: "year",
      trial_end: new Date(1_790_000_000_000).toISOString(),
      current_period_end: new Date(1_790_000_000_000).toISOString(),
      cancel_at_period_end: false,
    })
  })
})

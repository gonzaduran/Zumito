"use client"

import { cn } from "cn"
import { Check, Clock, Lock, ShieldCheck, Sparkles } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Dictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { openBillingPortal, startCheckout, type BillingActionResult } from "@/lib/actions/billing"
import type { BillingInterval } from "@/lib/billing/plans"

export type PlansViewProps = {
  labels: Dictionary["plans"]
  /** Textos ya formateados en el servidor. */
  prices: {
    month: string
    year: string
    yearMonthly: string
    welcomeYear: string
    savePercent: string
    discountPercent: string
  }
  premium: boolean
  /** Mensaje de estado de la suscripción (prueba, renovación…), si es Premium. */
  statusMessage: string | null
  canManage: boolean
  trialAvailable: boolean
  /** Fecha del primer cobro si empieza hoy la prueba ("8 de octubre"). */
  firstChargeDate: string
  paymentsEnabled: boolean
  /** Milisegundos que le quedan a la oferta de bienvenida al cargar la página. */
  offerRemainingMs: number
  success: boolean
  showContinueFree: boolean
}

const pad = (value: number) => String(value).padStart(2, "0")

/** Cuenta atrás en el navegador a partir de lo que dijo el servidor (el servidor decide al pagar). */
function useCountdown(initialMs: number) {
  const [end] = useState(() => Date.now() + initialMs)
  const [left, setLeft] = useState(initialMs)
  useEffect(() => {
    if (initialMs <= 0) return
    const timer = setInterval(() => {
      const next = Math.max(0, end - Date.now())
      setLeft(next)
      if (next === 0) clearInterval(timer)
    }, 250)
    return () => clearInterval(timer)
  }, [end, initialMs])
  return left
}

export function PlansView(props: PlansViewProps) {
  const { labels, prices, premium } = props
  const [interval, setInterval] = useState<BillingInterval>("year")
  const [pending, startTransition] = useTransition()
  const left = useCountdown(props.offerRemainingMs)
  const offerLive = left > 0 && !premium
  const withOffer = offerLive && interval === "year"
  const seconds = Math.ceil(left / 1000)

  const price = interval === "year" ? (withOffer ? prices.welcomeYear : prices.year) : prices.month
  const cta = props.trialAvailable ? labels.trialCta : labels.subscribeCta

  const run = (action: () => Promise<BillingActionResult>) =>
    startTransition(async () => {
      const result = await action().catch(() => ({ error: "failed" as const }))
      if ("url" in result) {
        window.location.assign(result.url)
        return
      }
      if (result.error === "alreadyPremium") window.location.reload()
      else toast.error(result.error === "notConfigured" ? labels.notConfigured : labels.failed)
    })

  return (
    <div className="flex flex-col gap-6">
      {props.success ? (
        <Card className="flex items-start gap-3 bg-primary-wash">
          <Sparkles aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary-text" />
          <div>
            <p className="font-extrabold">{labels.successTitle}</p>
            <p className="text-sm text-muted-foreground">{labels.successText}</p>
          </div>
        </Card>
      ) : null}

      {premium ? (
        <Card className="flex flex-col gap-3">
          <p className="flex items-center gap-2 font-extrabold">
            <Sparkles aria-hidden="true" className="size-5 text-primary-text" />
            {labels.premium.name}
          </p>
          {props.statusMessage ? (
            <p className="text-sm text-muted-foreground">{props.statusMessage}</p>
          ) : null}
          {props.canManage ? (
            <Button variant="secondary" disabled={pending} onClick={() => run(openBillingPortal)}>
              {labels.manage}
            </Button>
          ) : null}
        </Card>
      ) : (
        <>
          <div>
            <h2 className="text-[26px] leading-tight font-extrabold">{labels.heroTitle}</h2>
            <p className="mt-1 text-[15px] text-muted-foreground">{labels.heroText}</p>
          </div>

          {props.offerRemainingMs > 0 ? (
            <section
              aria-label={labels.offerBadge}
              className="relative overflow-hidden rounded-lg bg-linear-155 from-primary to-primary-strong p-5 text-primary-foreground shadow-card"
            >
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white/16 px-3 py-1 text-xs font-bold">
                <Clock aria-hidden="true" className="size-3.5" />
                {labels.offerBadge}
              </p>
              {offerLive ? (
                <>
                  <p className="mt-3 text-[22px] leading-tight font-extrabold">
                    {interpolate(labels.offerTitle, { percent: prices.discountPercent })}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {interpolate(labels.offerText, {
                      price: prices.welcomeYear,
                      regular: prices.year,
                    })}
                  </p>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <p className="text-xs font-bold">{labels.offerEndsIn}</p>
                    <p
                      role="timer"
                      aria-live="off"
                      className="num text-[44px] leading-none font-extrabold tracking-tight"
                    >
                      {pad(Math.floor(seconds / 60))}:{pad(seconds % 60)}
                    </p>
                  </div>
                </>
              ) : (
                <p className="mt-3 font-bold">{labels.offerEnded}</p>
              )}
            </section>
          ) : null}

          <Tabs value={interval} onValueChange={(value) => setInterval(value as BillingInterval)}>
            <TabsList variant="segmented" aria-label={labels.intervalLabel}>
              <TabsTrigger value="month">{labels.monthly}</TabsTrigger>
              <TabsTrigger value="year" className="gap-1.5">
                {labels.yearly}
                <span className="ml-1.5 rounded-full bg-primary px-2 py-0.5 text-[11px] font-extrabold text-primary-foreground">
                  {interpolate(labels.saveBadge, { percent: prices.savePercent })}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </>
      )}

      <section
        aria-labelledby="plan-premium"
        className={cn(
          "relative rounded-lg bg-card p-5 shadow-card",
          !premium && "ring-2 ring-primary-text",
        )}
      >
        {!premium ? (
          <p className="absolute -top-3 right-5 rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">
            {labels.mostChosen}
          </p>
        ) : null}
        <h2 id="plan-premium" className="text-lg font-extrabold">
          {labels.premium.name}
        </h2>
        <p className="text-sm text-muted-foreground">{labels.premium.tagline}</p>
        {!premium ? (
          <div className="mt-4">
            <p className="flex items-baseline gap-2">
              {withOffer ? (
                <s className="num text-lg font-bold text-muted-foreground">{prices.year}</s>
              ) : null}
              <span className="num text-[40px] leading-none font-extrabold">{price}</span>
              <span className="font-bold text-muted-foreground">
                {interval === "year" ? labels.perYear : labels.perMonth}
              </span>
            </p>
            {interval === "year" ? (
              <p className="mt-1 text-sm font-bold text-positive">
                {interpolate(labels.monthlyEquivalent, { amount: prices.yearMonthly })}
              </p>
            ) : null}
          </div>
        ) : null}
        <ul className="mt-4 flex flex-col gap-2.5">
          {labels.premium.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm font-semibold">
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-text" />
              {feature}
            </li>
          ))}
          {labels.premium.upcoming.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                {feature}{" "}
                <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold">
                  {labels.soon}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">{labels.soonNote}</p>
        {!premium ? (
          <div className="mt-5 flex flex-col gap-2">
            <Button
              size="lg"
              disabled={pending || !props.paymentsEnabled}
              onClick={() => run(() => startCheckout(interval))}
            >
              {cta}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {!props.paymentsEnabled
                ? labels.notConfigured
                : props.trialAvailable
                  ? interpolate(labels.trialNote, { date: props.firstChargeDate, price })
                  : labels.renewNote}
            </p>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="plan-free" className="rounded-lg bg-card p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <h2 id="plan-free" className="text-lg font-extrabold">
            {labels.free.name}
          </h2>
          {!premium ? (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">
              {labels.currentPlan}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{labels.free.tagline}</p>
        <p className="mt-3 num text-[28px] font-extrabold">0 €</p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {labels.free.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm">
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-positive" />
              {feature}
            </li>
          ))}
        </ul>
        {props.showContinueFree && !premium ? (
          <Link
            href="/"
            className="mt-4 flex h-11 items-center justify-center rounded-full text-sm font-bold text-primary-text outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {labels.continueFree}
          </Link>
        ) : null}
      </section>

      <section
        aria-labelledby="plan-friends"
        className="rounded-lg border-2 border-dashed border-border p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="plan-friends" className="text-lg font-extrabold">
            {labels.friends.name}
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-bold">
            <Lock aria-hidden="true" className="size-3.5" />
            {labels.soon}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{labels.friends.tagline}</p>
        <p className="mt-2 num font-extrabold">{labels.friends.price}</p>
      </section>

      <p className="flex items-center justify-center gap-2 text-center text-xs font-semibold text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
        {labels.secure}
      </p>

      <section aria-labelledby="plans-faq">
        <h2 id="plans-faq" className="mb-2 text-[15px] font-extrabold">
          {labels.faqTitle}
        </h2>
        <div className="flex flex-col divide-y divide-border rounded-md bg-card px-4 shadow-card">
          {labels.faq.map((item) => (
            <details key={item.q} className="group py-1">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                {item.q}
                <span aria-hidden="true" className="text-muted-foreground group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-3 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}

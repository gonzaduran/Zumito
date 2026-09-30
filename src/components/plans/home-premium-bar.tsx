"use client"

import Link from "next/link"

import type { Dictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { formatCountdown, useCountdown } from "@/hooks/use-countdown"

import { PremiumBar, premiumBarActionClass } from "./premium-bar"

/** Barra de Premium del Inicio (solo sin Premium): oferta con cuenta atrás o prueba gratis. */
export function HomePremiumBar({
  labels,
  label,
  offerRemainingMs,
  trialAvailable,
  welcomePrice,
  monthPrice,
}: {
  labels: Dictionary["plans"]["bar"]
  label: string
  offerRemainingMs: number
  trialAvailable: boolean
  welcomePrice: string
  monthPrice: string
}) {
  const left = useCountdown(offerRemainingMs)
  const [title, text, cta] =
    left > 0
      ? [
          interpolate(labels.offerTitle, { price: welcomePrice }),
          interpolate(labels.offerEndsIn, { time: formatCountdown(left) }),
          labels.offerCta,
        ]
      : trialAvailable
        ? [labels.trialTitle, labels.trialText, labels.trialCta]
        : [
            labels.subscribeTitle,
            interpolate(labels.subscribeText, { price: monthPrice }),
            labels.subscribeCta,
          ]
  return (
    <PremiumBar
      label={label}
      title={title}
      text={<span className="num">{text}</span>}
      action={
        <Link href="/planes" className={premiumBarActionClass}>
          {cta}
        </Link>
      }
    />
  )
}
